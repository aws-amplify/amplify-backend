// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { TestProjectBase } from './test_project_base.js';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { TestProjectCreator } from './test_project_creator.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import {
  DescribeTableCommand,
  DescribeTimeToLiveCommand,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { shortUuid } from '../short_uuid.js';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';

/**
 * Placeholder token in the fixture `backend.ts` replaced at project-creation
 * time with a per-run unique Connect instance alias.
 */
const INSTANCE_ALIAS_PLACEHOLDER = '$INSTANCE_ALIAS';

/**
 * Creates the create-from-scratch notifications test project.
 *
 * `defineNotifications({ instanceAlias })` with no `domainName` provisions a
 * brand-new Amazon Connect instance + Customer Profiles domain, a DynamoDB
 * device store, a SigV4 HTTP API and the supporting Lambdas. This Phase-0
 * project only makes STRUCTURAL assertions (client-config outputs, Devices
 * table shape, HTTP API routes) — it never invokes Connect or sends a push.
 */
export class NotificationsProjectTestProjectCreator implements TestProjectCreator {
  readonly name = 'notifications';

  /**
   * Creates project creator.
   */
  constructor(
    private readonly cfnClient: CloudFormationClient = new CloudFormationClient(
      e2eToolingClientConfig,
    ),
    private readonly amplifyClient: AmplifyClient = new AmplifyClient(
      e2eToolingClientConfig,
    ),
    private readonly dynamoDBClient: DynamoDBClient = new DynamoDBClient(
      e2eToolingClientConfig,
    ),
    private readonly resourceFinder: DeployedResourcesFinder = new DeployedResourcesFinder(
      cfnClient,
    ),
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new NotificationsProjectTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
      this.dynamoDBClient,
      this.resourceFinder,
    );
    await fs.cp(
      project.sourceProjectAmplifyDirURL,
      project.projectAmplifyDirPath,
      {
        recursive: true,
      },
    );

    // Inject a per-run unique Connect instance alias so concurrent / repeated
    // runs never collide on the globally-unique alias. Connect aliases must be
    // lowercase alphanumeric + hyphens; `shortUuid()` returns lowercase hex.
    const backendFilePath = path.join(
      project.projectAmplifyDirPath,
      'backend.ts',
    );
    const backendFileContents = await fs.readFile(backendFilePath, 'utf-8');
    await fs.writeFile(
      backendFilePath,
      backendFileContents.replace(
        INSTANCE_ALIAS_PLACEHOLDER,
        `amplify-notif-e2e-${shortUuid()}`,
      ),
    );

    return project;
  };
}

/**
 * The create-from-scratch notifications test project.
 */
class NotificationsProjectTestProject extends TestProjectBase {
  readonly sourceProjectDirPath = '../../src/test-projects/notifications';

  readonly sourceProjectAmplifyDirSuffix = `${this.sourceProjectDirPath}/amplify`;

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    this.sourceProjectAmplifyDirSuffix,
    import.meta.url,
  );

  /**
   * Create a test project instance.
   */
  constructor(
    name: string,
    projectDirPath: string,
    projectAmplifyDirPath: string,
    cfnClient: CloudFormationClient,
    amplifyClient: AmplifyClient,
    private readonly dynamoDBClient: DynamoDBClient,
    private readonly resourceFinder: DeployedResourcesFinder,
  ) {
    super(
      name,
      projectDirPath,
      projectAmplifyDirPath,
      cfnClient,
      amplifyClient,
    );
  }

  override async assertPostDeployment(
    backendId: BackendIdentifier,
  ): Promise<void> {
    // Base assertions: client config file exists and validates against the
    // versioned client-config JSON schema (schema_v<version>.json).
    await super.assertPostDeployment(backendId);

    await this.assertAmazonConnectClientConfig();
    await this.assertDevicesTable(backendId);
    await this.assertHttpApiRoutes(backendId);
  }

  /**
   * (a) The client config surfaces the canonical
   * `notifications.amazon_connect` section with a non-empty `endpoint` and
   * `aws_region`.
   */
  private assertAmazonConnectClientConfig = async (): Promise<void> => {
    const outputsPath = path.join(this.projectDirPath, 'amplify_outputs.json');
    const outputs = JSON.parse(await fs.readFile(outputsPath, 'utf-8'));

    const amazonConnect = outputs?.notifications?.amazon_connect;
    assert.ok(
      amazonConnect,
      'Expected notifications.amazon_connect section in amplify_outputs.json',
    );
    assert.ok(
      typeof amazonConnect.endpoint === 'string' &&
        amazonConnect.endpoint.length > 0,
      'Expected notifications.amazon_connect.endpoint to be a non-empty string',
    );
    assert.ok(
      typeof amazonConnect.aws_region === 'string' &&
        amazonConnect.aws_region.length > 0,
      'Expected notifications.amazon_connect.aws_region to be a non-empty string',
    );
    console.log(
      `notifications.amazon_connect = ${JSON.stringify(amazonConnect)}`,
    );
  };

  /**
   * (b) The Devices DynamoDB table exists with PK = deviceId, a GSI on
   * principalId (KEYS_ONLY), and native TTL enabled on the `ttl` attribute.
   */
  private assertDevicesTable = async (
    backendId: BackendIdentifier,
  ): Promise<void> => {
    const tableNames = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::DynamoDB::Table',
      () => true,
      (logicalId) => logicalId.includes('DevicesTable'),
    );
    assert.strictEqual(
      tableNames.length,
      1,
      `Expected exactly one Devices table, found: ${JSON.stringify(tableNames)}`,
    );
    const tableName = tableNames[0];

    const { Table: table } = await this.dynamoDBClient.send(
      new DescribeTableCommand({ TableName: tableName }),
    );
    assert.ok(table, `DescribeTable returned no table for ${tableName}`);

    const hashKey = (table.KeySchema ?? []).find((k) => k.KeyType === 'HASH');
    assert.strictEqual(
      hashKey?.AttributeName,
      'deviceId',
      `Expected Devices table partition key 'deviceId', got '${hashKey?.AttributeName}'`,
    );

    const secondaryIndexes = table.GlobalSecondaryIndexes ?? [];
    const principalGsi = secondaryIndexes.find((gsi) =>
      (gsi.KeySchema ?? []).some(
        (k) => k.KeyType === 'HASH' && k.AttributeName === 'principalId',
      ),
    );
    assert.ok(
      principalGsi,
      `Expected a GSI keyed on 'principalId', found indexes: ${JSON.stringify(
        secondaryIndexes.map((g) => ({ name: g.IndexName, keys: g.KeySchema })),
      )}`,
    );

    await this.assertTtlEnabled(tableName);

    console.log(
      `Devices table '${tableName}': PK=deviceId, GSI on principalId (${principalGsi.IndexName}), TTL on 'ttl' enabled`,
    );
  };

  private assertTtlEnabled = async (tableName: string): Promise<void> => {
    const { TimeToLiveDescription: ttlDescription } =
      await this.dynamoDBClient.send(
        new DescribeTimeToLiveCommand({ TableName: tableName }),
      );
    assert.ok(
      ttlDescription?.TimeToLiveStatus === 'ENABLED' ||
        ttlDescription?.TimeToLiveStatus === 'ENABLING',
      `Expected TTL ENABLED on '${tableName}', got '${ttlDescription?.TimeToLiveStatus}'`,
    );
    assert.strictEqual(
      ttlDescription?.AttributeName,
      'ttl',
      `Expected TTL attribute 'ttl', got '${ttlDescription?.AttributeName}'`,
    );
  };

  /**
   * (c) The HTTP API fronting the SigV4 write routes exposes exactly the three
   * expected routes (identify-user, register-device, remove-device).
   */
  private assertHttpApiRoutes = async (
    backendId: BackendIdentifier,
  ): Promise<void> => {
    const routes = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::ApiGatewayV2::Route',
    );
    assert.strictEqual(
      routes.length,
      3,
      `Expected 3 HTTP API routes, found ${routes.length}: ${JSON.stringify(routes)}`,
    );
    console.log(`HTTP API routes deployed: ${routes.length}`);
  };
}
