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
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import {
  CustomerProfilesClient,
  GetProfileObjectTypeCommand,
} from '@aws-sdk/client-customer-profiles';
import { generateClientConfig } from '@aws-amplify/client-config';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { shortUuid } from '../short_uuid.js';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { AmplifyAuthCredentialsFactory } from '../amplify_auth_credentials_factory.js';
import { IamCredentials } from '../types.js';
import { signedPost } from '../notifications_signed_request.js';
import { assertIdentityResolutionDisabled } from '../customer_profiles_identity_resolution.js';
import { CustomerProfilesDomainCreator } from '../resource-creation/customer_profiles_domain_creator.js';

/**
 * Placeholder token in the fixture `backend.ts` replaced at project-creation
 * time with the throwaway Customer Profiles domain created for the run.
 */
const DOMAIN_NAME_PLACEHOLDER = '$DOMAIN_NAME';

/**
 * The object type `defineNotifications` registers into the attached domain
 * (frozen contract — see backend-notifications `OBJECT_TYPE_PROFILE`).
 */
const OBJECT_TYPE_PROFILE = 'AmplifyProfile';

/**
 * Searchable Customer Profiles identity key the backend binds a profile to its
 * `principalId` on (frozen contract — see backend-notifications
 * `PRINCIPAL_ID_KEY`).
 */
const PRINCIPAL_ID_KEY = 'principalIdKey';

/** CloudFormation resource type of the deploy-time compatibility check. */
const GUARD_RESOURCE_TYPE = 'Custom::NotificationsIdentityResolutionGuard';

/**
 * Whether the throwaway domain a test attaches to has Identity Resolution
 * enabled. `disabled` is the configuration `defineNotifications` supports;
 * `enabled` is the configuration it must refuse at deploy time.
 */
export type AttachedDomainIdentityResolution = 'disabled' | 'enabled';

/**
 * Creates the attach-mode notifications test project.
 *
 * `defineNotifications({ domainName })` ATTACHES to a pre-existing Customer
 * Profiles domain: it registers the AmplifyProfile object type into that domain
 * and creates neither a Connect instance nor a domain. The domain is NOT owned
 * by the Amplify stack, so its Identity Resolution setting is a property of a
 * customer-owned resource that the deployment has to check.
 *
 * Each created project owns a throwaway domain, created directly with the SDK
 * and configured per {@link AttachedDomainIdentityResolution}. The domain is
 * deleted by {@link NotificationsAttachProjectTestProject.tearDown}.
 */
export class NotificationsAttachProjectTestProjectCreator implements TestProjectCreator {
  readonly name = 'notifications-attach';

  /**
   * Creates project creator.
   * @param attachedDomainIdentityResolution Identity Resolution state to give
   * the throwaway domain the project attaches to.
   * @param cfnClient CloudFormation client.
   * @param amplifyClient Amplify client.
   * @param customerProfilesClient Customer Profiles client.
   * @param cognitoIdentityProviderClient Cognito Identity Provider client.
   * @param resourceFinder Finds physical resource ids in the deployed stack.
   */
  constructor(
    private readonly attachedDomainIdentityResolution: AttachedDomainIdentityResolution = 'disabled',
    private readonly cfnClient: CloudFormationClient = new CloudFormationClient(
      e2eToolingClientConfig,
    ),
    private readonly amplifyClient: AmplifyClient = new AmplifyClient(
      e2eToolingClientConfig,
    ),
    private readonly customerProfilesClient: CustomerProfilesClient = new CustomerProfilesClient(
      e2eToolingClientConfig,
    ),
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient = new CognitoIdentityProviderClient(
      e2eToolingClientConfig,
    ),
    private readonly resourceFinder: DeployedResourcesFinder = new DeployedResourcesFinder(
      cfnClient,
    ),
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    // The domain is created BEFORE the deploy so `domainName` can be baked into
    // the fixture: attach mode requires the domain to already exist.
    const domainCreator = new CustomerProfilesDomainCreator(
      this.customerProfilesClient,
    );
    const attachedDomainName = await domainCreator.createDomain();
    if (this.attachedDomainIdentityResolution === 'enabled') {
      await domainCreator.enableIdentityResolution(attachedDomainName);
    }

    const project = new NotificationsAttachProjectTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
      this.customerProfilesClient,
      this.cognitoIdentityProviderClient,
      this.resourceFinder,
      domainCreator,
      attachedDomainName,
    );
    await fs.cp(
      project.sourceProjectAmplifyDirURL,
      project.projectAmplifyDirPath,
      {
        recursive: true,
      },
    );

    const backendFilePath = path.join(
      project.projectAmplifyDirPath,
      'backend.ts',
    );
    const backendFileContents = await fs.readFile(backendFilePath, 'utf-8');
    await fs.writeFile(
      backendFilePath,
      backendFileContents.replace(DOMAIN_NAME_PLACEHOLDER, attachedDomainName),
    );

    return project;
  };
}

/**
 * The attach-mode notifications test project.
 */
export class NotificationsAttachProjectTestProject extends TestProjectBase {
  readonly sourceProjectDirPath =
    '../../src/test-projects/notifications-attach';

  readonly sourceProjectAmplifyDirSuffix = `${this.sourceProjectDirPath}/amplify`;

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    this.sourceProjectAmplifyDirSuffix,
    import.meta.url,
  );

  /**
   * Create a test project instance.
   * @param name Project name.
   * @param projectDirPath Project root directory.
   * @param projectAmplifyDirPath Project `amplify` directory.
   * @param cfnClient CloudFormation client.
   * @param amplifyClient Amplify client.
   * @param customerProfilesClient Customer Profiles client.
   * @param cognitoIdentityProviderClient Cognito Identity Provider client.
   * @param resourceFinder Finds physical resource ids in the deployed stack.
   * @param domainCreator Owns the throwaway domain's lifecycle.
   * @param attachedDomainName The domain `defineNotifications` attaches to.
   */
  constructor(
    name: string,
    projectDirPath: string,
    projectAmplifyDirPath: string,
    cfnClient: CloudFormationClient,
    amplifyClient: AmplifyClient,
    private readonly customerProfilesClient: CustomerProfilesClient,
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient,
    private readonly resourceFinder: DeployedResourcesFinder,
    private readonly domainCreator: CustomerProfilesDomainCreator,
    readonly attachedDomainName: string,
  ) {
    super(
      name,
      projectDirPath,
      projectAmplifyDirPath,
      cfnClient,
      amplifyClient,
    );
  }

  /**
   * Verify the attach-mode deployment against the live attached domain.
   * @param backendId The deployed backend.
   */
  override async assertPostDeployment(
    backendId: BackendIdentifier,
  ): Promise<void> {
    // Base assertions: client config file exists and validates against the
    // versioned client-config JSON schema (schema_v<version>.json).
    await super.assertPostDeployment(backendId);

    await this.assertGuardResourceProvisioned(backendId);
    await this.assertProfileObjectTypeRegistered();
    await assertIdentityResolutionDisabled(
      this.customerProfilesClient,
      this.attachedDomainName,
    );

    await this.assertIdentifyUserAccepted(backendId);
  }

  /**
   * Tear down the project, then the throwaway domain it attached to.
   *
   * Order matters: the AmplifyProfile object type is a stack resource
   * registered INTO the domain, so the stack has to be gone before the domain
   * can be removed — hence `waitForStackDeletion` defaults to `true` here. The
   * domain delete runs in a `finally` so a slow or failed stack deletion can
   * never leak a billable domain.
   * @param backendIdentifier The backend being torn down.
   * @param waitForStackDeletion Whether to wait for the stack to disappear
   * before deleting the attached domain.
   */
  override async tearDown(
    backendIdentifier: BackendIdentifier,
    waitForStackDeletion: boolean = true,
  ): Promise<void> {
    try {
      await super.tearDown(backendIdentifier, waitForStackDeletion);
    } finally {
      await this.domainCreator.cleanupResources();
    }
  }

  /**
   * Assert the AmplifyProfile object type was NOT registered into the attached
   * domain.
   *
   * Every notifications resource that reads or writes profiles takes an explicit
   * CloudFormation dependency on the deploy-time check, so a stopped deployment
   * must leave the customer-owned domain completely untouched.
   */
  assertProfileObjectTypeNotRegistered = async (): Promise<void> => {
    let registered = false;
    try {
      await this.customerProfilesClient.send(
        new GetProfileObjectTypeCommand({
          /* eslint-disable @typescript-eslint/naming-convention -- Customer
             Profiles API request shapes are PascalCase by contract. */
          DomainName: this.attachedDomainName,
          ObjectTypeName: OBJECT_TYPE_PROFILE,
          /* eslint-enable @typescript-eslint/naming-convention */
        }),
      );
      registered = true;
    } catch (err) {
      assert.strictEqual(
        (err as { name?: string })?.name,
        'ResourceNotFoundException',
        `Expected ${OBJECT_TYPE_PROFILE} to be absent from ${this.attachedDomainName}, got an unexpected error: ${String(err)}`,
      );
    }
    assert.strictEqual(
      registered,
      false,
      `Expected ${OBJECT_TYPE_PROFILE} NOT to be registered on ${this.attachedDomainName} after a stopped deployment`,
    );
    console.log(
      `${OBJECT_TYPE_PROFILE} correctly absent from ${this.attachedDomainName}`,
    );
  };

  /**
   * The deploy-time compatibility check is wired in attach mode, so the stack
   * contains exactly one of its custom resources.
   */
  private assertGuardResourceProvisioned = async (
    backendId: BackendIdentifier,
  ): Promise<void> => {
    const guards = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      GUARD_RESOURCE_TYPE,
    );
    assert.strictEqual(
      guards.length,
      1,
      `Expected exactly one ${GUARD_RESOURCE_TYPE} resource in attach mode, found: ${JSON.stringify(guards)}`,
    );
    console.log(`${GUARD_RESOURCE_TYPE} provisioned: ${guards[0]}`);
  };

  /**
   * Attaching registers the AmplifyProfile object type INTO the pre-existing
   * domain, keyed on the searchable `principalIdKey` so each profile belongs to
   * exactly one caller principal.
   */
  private assertProfileObjectTypeRegistered = async (): Promise<void> => {
    const objectType = await this.customerProfilesClient.send(
      new GetProfileObjectTypeCommand({
        /* eslint-disable @typescript-eslint/naming-convention -- Customer
           Profiles API request shapes are PascalCase by contract. */
        DomainName: this.attachedDomainName,
        ObjectTypeName: OBJECT_TYPE_PROFILE,
        /* eslint-enable @typescript-eslint/naming-convention */
      }),
    );

    assert.strictEqual(
      objectType.ObjectTypeName,
      OBJECT_TYPE_PROFILE,
      `Expected ${OBJECT_TYPE_PROFILE} to be registered on attached domain ${this.attachedDomainName}`,
    );
    assert.strictEqual(
      objectType.AllowProfileCreation,
      true,
      `Expected ${OBJECT_TYPE_PROFILE}.AllowProfileCreation to be true`,
    );

    const principalIdKey = objectType.Keys?.[PRINCIPAL_ID_KEY];
    assert.ok(
      principalIdKey && principalIdKey.length > 0,
      `Expected ${OBJECT_TYPE_PROFILE} to declare the '${PRINCIPAL_ID_KEY}' key, got ${JSON.stringify(
        Object.keys(objectType.Keys ?? {}),
      )}`,
    );
    const identifiers = principalIdKey[0].StandardIdentifiers ?? [];
    assert.ok(
      identifiers.includes('PROFILE') && identifiers.includes('UNIQUE'),
      `Expected '${PRINCIPAL_ID_KEY}' to be a UNIQUE PROFILE key so one principal maps to one profile, got ${JSON.stringify(identifiers)}`,
    );
    console.log(
      `${OBJECT_TYPE_PROFILE} registered on attached domain ${this.attachedDomainName} ` +
        `with '${PRINCIPAL_ID_KEY}' ${JSON.stringify(identifiers)}`,
    );
  };

  /**
   * A profile write against an attached domain with Identity Resolution
   * disabled is served: the per-request compatibility check accepts the
   * supported configuration instead of refusing everything.
   * @param backendId The deployed backend.
   */
  private assertIdentifyUserAccepted = async (
    backendId: BackendIdentifier,
  ): Promise<void> => {
    const { endpoint, region } = await this.readAmazonConnectOutputs();

    const clientConfig = await generateClientConfig(backendId, '1.4');
    assert.ok(clientConfig.auth, 'Client config is missing auth section');
    const authFactory = new AmplifyAuthCredentialsFactory(
      this.cognitoIdentityProviderClient,
      clientConfig.auth,
    );
    const authUser = await authFactory.getNewAuthenticatedUserCredentials();
    const credentials: IamCredentials = authUser.iamCredentials;

    const res = await signedPost(
      endpoint,
      '/identify-user',
      region,
      credentials,
      {
        userProfile: {
          email: `notif-attach-e2e-${shortUuid()}@amazon.com`,
        },
      },
    );
    assert.strictEqual(
      res.status,
      200,
      `Expected identify-user to succeed while Identity Resolution is disabled, got ${res.status} ${res.body}`,
    );
    console.log(
      `identify-user accepted against attached domain ${this.attachedDomainName}`,
    );
  };

  /**
   * Read the deployed notifications endpoint + region from the generated client
   * config, validating the endpoint is an https execute-api URL.
   */
  private readAmazonConnectOutputs = async (): Promise<{
    endpoint: string;
    region: string;
  }> => {
    const outputsPath = path.join(this.projectDirPath, 'amplify_outputs.json');
    const outputs = JSON.parse(await fs.readFile(outputsPath, 'utf-8'));

    const amazonConnect = outputs?.notifications?.amazon_connect;
    assert.ok(
      amazonConnect,
      'Expected notifications.amazon_connect section in amplify_outputs.json',
    );
    assert.ok(
      typeof amazonConnect.aws_region === 'string' &&
        amazonConnect.aws_region.length > 0,
      'Expected notifications.amazon_connect.aws_region to be a non-empty string',
    );

    // Validate the endpoint before it is used as a request target. Also what
    // makes this safe for CodeQL's `js/file-access-to-http` taint flow (file
    // data -> outbound request): the returned value is a validated URL origin,
    // not raw file data.
    let url: URL;
    try {
      url = new URL(amazonConnect.endpoint);
    } catch (err) {
      throw new Error(
        `notifications.amazon_connect.endpoint is not a valid URL: ${amazonConnect.endpoint}`,
        { cause: err },
      );
    }
    assert.strictEqual(
      url.protocol,
      'https:',
      `Expected notifications.amazon_connect.endpoint to use https, got ${url.protocol}`,
    );
    assert.ok(
      /\.execute-api\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname),
      `Expected notifications.amazon_connect.endpoint to be an execute-api host, got ${url.hostname}`,
    );

    return {
      endpoint: `${url.protocol}//${url.host}${url.pathname}`.replace(
        /\/$/,
        '',
      ),
      region: amazonConnect.aws_region as string,
    };
  };
}
