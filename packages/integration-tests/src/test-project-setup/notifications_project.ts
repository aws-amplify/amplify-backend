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
  AttributeValue,
  DescribeTableCommand,
  DescribeTimeToLiveCommand,
  DynamoDBClient,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import {
  CustomerProfilesClient,
  Profile,
  SearchProfilesCommand,
} from '@aws-sdk/client-customer-profiles';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { generateClientConfig } from '@aws-amplify/client-config';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { shortUuid } from '../short_uuid.js';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { AmplifyAuthCredentialsFactory } from '../amplify_auth_credentials_factory.js';
import { IamCredentials } from '../types.js';

/**
 * Placeholder token in the fixture `backend.ts` replaced at project-creation
 * time with a per-run unique Connect instance alias.
 */
const INSTANCE_ALIAS_PLACEHOLDER = '$INSTANCE_ALIAS';

/**
 * Searchable Customer Profiles identity key the backend binds a profile to its
 * `principalId` on (frozen contract — see backend-notifications `PRINCIPAL_ID_KEY`).
 */
const PRINCIPAL_ID_KEY = 'principalIdKey';

/** Small HTTP result of a signed write-route call. */
type SignedResponse = {
  status: number;
  body: string;
};

/**
 * Creates the create-from-scratch notifications test project.
 *
 * `defineNotifications({ instanceAlias })` with no `domainName` provisions a
 * brand-new Amazon Connect instance + Customer Profiles domain, a DynamoDB
 * device store, a SigV4 HTTP API and the supporting Lambdas.
 *
 * Assertions run in two phases:
 *   - Phase 0 (structural): client-config outputs, Devices table shape, routes.
 *   - Phase 1 (functional): SigV4-signed calls to the three write routes with
 *     real authenticated + guest Identity Pool credentials, verified against
 *     Customer Profiles + DynamoDB, plus the principalId-injection security
 *     regression. No push campaigns / no Connect invocation.
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

    const project = new NotificationsProjectTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
      this.dynamoDBClient,
      this.customerProfilesClient,
      this.cognitoIdentityProviderClient,
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
    private readonly customerProfilesClient: CustomerProfilesClient,
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient,
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

    // Phase 0 — structural.
    const amazonConnect = await this.assertAmazonConnectClientConfig();
    const tableName = await this.assertDevicesTable(backendId);
    await this.assertHttpApiRoutes(backendId);

    // Phase 1 — functional SigV4 routes + security regression.
    await this.assertFunctionalRoutes(backendId, amazonConnect, tableName);
  }

  /**
   * (a) The client config surfaces the canonical
   * `notifications.amazon_connect` section with a non-empty `endpoint` and
   * `aws_region`.
   */
  private assertAmazonConnectClientConfig = async (): Promise<{
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
    return {
      endpoint: amazonConnect.endpoint,
      region: amazonConnect.aws_region,
    };
  };

  /**
   * (b) The Devices DynamoDB table exists with PK = deviceId, a GSI on
   * principalId (KEYS_ONLY), and native TTL enabled on the `ttl` attribute.
   * Returns the physical table name for the functional assertions.
   */
  private assertDevicesTable = async (
    backendId: BackendIdentifier,
  ): Promise<string> => {
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
    return tableName;
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

  /**
   * Phase 1 — functional SigV4 route tests + the principalId-injection security
   * regression, executed against the freshly deployed infrastructure.
   */
  private assertFunctionalRoutes = async (
    backendId: BackendIdentifier,
    amazonConnect: { endpoint: string; region: string },
    tableName: string,
  ): Promise<void> => {
    const { endpoint, region } = amazonConnect;

    // Resolve the created Customer Profiles domain name for profile lookups.
    const domainNames = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::CustomerProfiles::Domain',
    );
    assert.strictEqual(
      domainNames.length,
      1,
      `Expected exactly one Customer Profiles domain, found: ${JSON.stringify(domainNames)}`,
    );
    const domainName = domainNames[0];
    console.log(`Customer Profiles domain: ${domainName}`);

    // Real Identity Pool credentials + their derived principalIds (identityId).
    const clientConfig = await generateClientConfig(backendId, '1.4');
    assert.ok(clientConfig.auth, 'Client config is missing auth section');
    const authFactory = new AmplifyAuthCredentialsFactory(
      this.cognitoIdentityProviderClient,
      clientConfig.auth,
    );
    const authUser = await authFactory.getNewAuthenticatedUserCredentials();
    const guest = await authFactory.getGuestAccessCredentialsWithIdentityId();
    const authCreds = authUser.iamCredentials;
    const authId = authUser.identityId;
    const guestCreds = guest.iamCredentials;
    const guestId = guest.identityId;
    assert.notStrictEqual(
      authId,
      guestId,
      'Authenticated and guest identityIds must differ',
    );
    console.log(
      `principals: auth=${authId} guest=${guestId} (region=${region})`,
    );

    const run = shortUuid();

    await this.assertIdentifyUserAuth(
      endpoint,
      region,
      domainName,
      authCreds,
      authId,
      run,
    );
    await this.assertRegisterDeviceAuth(
      endpoint,
      region,
      tableName,
      authCreds,
      authId,
      run,
    );
    await this.assertReHomeLastWriterWins(
      endpoint,
      region,
      tableName,
      guestCreds,
      guestId,
      run,
    );
    await this.assertRemoveDeviceOwnershipGate(
      endpoint,
      region,
      tableName,
      authCreds,
      guestCreds,
      guestId,
      run,
    );
    await this.assertGuestIdentifyUser(
      endpoint,
      region,
      domainName,
      guestCreds,
      guestId,
      run,
    );
    await this.assertPrincipalIdInjectionRejected(
      endpoint,
      region,
      domainName,
      authCreds,
      authId,
      run,
    );
    await this.assertServerValidationRejections(
      endpoint,
      region,
      domainName,
      tableName,
      authCreds,
      authId,
      run,
    );
    await this.assertBenignRemoveMissingDevice(
      endpoint,
      region,
      tableName,
      authCreds,
      run,
    );
  };

  /**
   * 1. identify-user (authenticated): signed POST -> 200, and the resulting
   *    Customer Profile reflects the FULL buildProfileUpdate (mapping.ts)
   *    contract: email -> EmailAddress, name -> First/LastName (split on first
   *    space), phone -> PhoneNumber, location.{city,country,postalCode,region}
   *    -> Address.{City,Country,PostalCode,Province}, customAttributes ->
   *    Attributes, and the server-derived Attributes.principalId === identityId.
   */
  private assertIdentifyUserAuth = async (
    endpoint: string,
    region: string,
    domainName: string,
    creds: IamCredentials,
    identityId: string,
    run: string,
  ): Promise<void> => {
    const email = `notif-e2e-${run}@example.com`;
    const phone = '+12065550100';
    const res = await this.signedPost(
      endpoint,
      '/identify-user',
      region,
      creds,
      {
        userProfile: {
          email,
          name: 'Ada Lovelace',
          phone,
          location: {
            city: 'Seattle',
            country: 'US',
            postalCode: '98101',
            region: 'WA',
          },
          customAttributes: { seg: 'x' },
        },
      },
    );
    assert.strictEqual(
      res.status,
      200,
      `identify-user (auth) expected 200, got ${res.status}: ${res.body}`,
    );

    const profile = await this.pollProfile(domainName, identityId);
    assert.ok(
      profile,
      `No Customer Profile found for principalId ${identityId}`,
    );
    assert.strictEqual(
      profile.Attributes?.principalId,
      identityId,
      `Expected Attributes.principalId === ${identityId}, got ${profile.Attributes?.principalId}`,
    );
    assert.strictEqual(
      profile.EmailAddress,
      email,
      `Expected EmailAddress === ${email}, got ${profile.EmailAddress}`,
    );
    assert.strictEqual(
      profile.FirstName,
      'Ada',
      `Expected FirstName === 'Ada', got ${profile.FirstName}`,
    );
    assert.strictEqual(
      profile.LastName,
      'Lovelace',
      `Expected LastName === 'Lovelace', got ${profile.LastName}`,
    );
    assert.strictEqual(
      profile.PhoneNumber,
      phone,
      `Expected PhoneNumber === ${phone}, got ${profile.PhoneNumber}`,
    );
    assert.strictEqual(
      profile.Address?.City,
      'Seattle',
      `Expected Address.City === 'Seattle', got ${profile.Address?.City}`,
    );
    assert.strictEqual(
      profile.Address?.Country,
      'US',
      `Expected Address.Country === 'US', got ${profile.Address?.Country}`,
    );
    assert.strictEqual(
      profile.Address?.PostalCode,
      '98101',
      `Expected Address.PostalCode === '98101', got ${profile.Address?.PostalCode}`,
    );
    assert.strictEqual(
      profile.Address?.Province,
      'WA',
      `Expected Address.Province === 'WA', got ${profile.Address?.Province}`,
    );
    assert.strictEqual(
      profile.Attributes?.seg,
      'x',
      `Expected Attributes.seg === 'x', got ${profile.Attributes?.seg}`,
    );
    console.log(
      `[1] identify-user(auth) 200; mapped Email=${profile.EmailAddress}, Name=${profile.FirstName}/${profile.LastName}, Phone=${profile.PhoneNumber}, Address={City=${profile.Address?.City},Country=${profile.Address?.Country},PostalCode=${profile.Address?.PostalCode},Province=${profile.Address?.Province}}, Attributes.principalId=${profile.Attributes?.principalId}, Attributes.seg=${profile.Attributes?.seg}`,
    );
  };

  /**
   * 2. register-device (authenticated): signed POST -> 200, and the DynamoDB
   *    item is owned by the caller identityId, carries the token, and has NO
   *    profileId attribute.
   */
  private assertRegisterDeviceAuth = async (
    endpoint: string,
    region: string,
    tableName: string,
    creds: IamCredentials,
    identityId: string,
    run: string,
  ): Promise<void> => {
    const deviceId = `notif-e2e-device-${run}`;
    const token = `notif-e2e-token-${run}-a`;
    const res = await this.signedPost(
      endpoint,
      '/register-device',
      region,
      creds,
      {
        device: {
          token,
          deviceId,
          platform: 'ios',
          appVersion: '',
          channelType: 'APNS',
        },
      },
    );
    assert.strictEqual(
      res.status,
      200,
      `register-device (auth) expected 200, got ${res.status}: ${res.body}`,
    );

    const item = await this.getDeviceItem(tableName, deviceId);
    assert.ok(item, `No device item found for ${deviceId}`);
    assert.strictEqual(
      item.principalId?.S,
      identityId,
      `Expected device principalId === ${identityId}, got ${item.principalId?.S}`,
    );
    assert.strictEqual(
      item.token?.S,
      token,
      `Expected device token === ${token}, got ${item.token?.S}`,
    );
    assert.strictEqual(
      item.channelType?.S,
      'APNS',
      `Expected device channelType === 'APNS', got ${item.channelType?.S}`,
    );
    assert.strictEqual(
      item.platform?.S,
      'ios',
      `Expected device platform === 'ios', got ${item.platform?.S}`,
    );
    assert.strictEqual(
      item.profileId,
      undefined,
      `Expected NO profileId attribute on device item, got ${JSON.stringify(item.profileId)}`,
    );
    console.log(
      `[2] register-device(auth) 200; item principalId=${item.principalId?.S}, token=${item.token?.S}, channelType=${item.channelType?.S}, platform=${item.platform?.S}, profileId=${item.profileId === undefined ? 'absent' : 'present'}`,
    );
  };

  /**
   * 3. Single-owner re-home (last-writer-wins): register the SAME deviceId as a
   *    SECOND principal (the guest); owner flips to the new principal, createdAt
   *    is preserved while updatedAt advances.
   */
  private assertReHomeLastWriterWins = async (
    endpoint: string,
    region: string,
    tableName: string,
    guestCreds: IamCredentials,
    guestId: string,
    run: string,
  ): Promise<void> => {
    const deviceId = `notif-e2e-device-${run}`;
    const before = await this.getDeviceItem(tableName, deviceId);
    assert.ok(
      before,
      `Expected existing device item for ${deviceId} before re-home`,
    );
    const createdAtBefore = before.createdAt?.S;
    const updatedAtBefore = before.updatedAt?.S;

    const token2 = `notif-e2e-token-${run}-b`;
    const res = await this.signedPost(
      endpoint,
      '/register-device',
      region,
      guestCreds,
      {
        device: {
          token: token2,
          deviceId,
          platform: 'android',
          appVersion: '',
          channelType: 'GCM',
        },
      },
    );
    assert.strictEqual(
      res.status,
      200,
      `re-home register-device (guest) expected 200, got ${res.status}: ${res.body}`,
    );

    const after = await this.getDeviceItem(tableName, deviceId);
    assert.ok(after, `Expected device item for ${deviceId} after re-home`);
    assert.strictEqual(
      after.principalId?.S,
      guestId,
      `Expected owner to flip to guest ${guestId}, got ${after.principalId?.S}`,
    );
    assert.strictEqual(
      after.token?.S,
      token2,
      `Expected token to update to ${token2}, got ${after.token?.S}`,
    );
    assert.strictEqual(
      after.createdAt?.S,
      createdAtBefore,
      `Expected createdAt preserved (${createdAtBefore}), got ${after.createdAt?.S}`,
    );
    assert.ok(
      after.updatedAt?.S &&
        updatedAtBefore &&
        after.updatedAt.S > updatedAtBefore,
      `Expected updatedAt to advance from ${updatedAtBefore}, got ${after.updatedAt?.S}`,
    );
    console.log(
      `[3] re-home LWW 200; owner ${guestId}, createdAt preserved=${after.createdAt?.S === createdAtBefore}, updatedAt advanced=${!!(after.updatedAt?.S && updatedAtBefore && after.updatedAt.S > updatedAtBefore)}`,
    );
  };

  /**
   * 4. remove-device ownership gate: a signed remove-device from the WRONG
   *    principal is a no-op (device still present); from the OWNER it deletes.
   *    (After assertion 3 the device is owned by the guest.)
   */
  private assertRemoveDeviceOwnershipGate = async (
    endpoint: string,
    region: string,
    tableName: string,
    wrongCreds: IamCredentials,
    ownerCreds: IamCredentials,
    ownerId: string,
    run: string,
  ): Promise<void> => {
    const deviceId = `notif-e2e-device-${run}`;

    const wrongRes = await this.signedPost(
      endpoint,
      '/remove-device',
      region,
      wrongCreds,
      {
        deviceId,
      },
    );
    assert.strictEqual(
      wrongRes.status,
      200,
      `remove-device (wrong principal) expected 200 no-op, got ${wrongRes.status}: ${wrongRes.body}`,
    );
    const stillThere = await this.getDeviceItem(tableName, deviceId);
    assert.ok(
      stillThere,
      `Expected device ${deviceId} to remain after wrong-principal remove`,
    );
    assert.strictEqual(
      stillThere.principalId?.S,
      ownerId,
      `Expected device still owned by ${ownerId} after wrong-principal remove`,
    );

    const ownerRes = await this.signedPost(
      endpoint,
      '/remove-device',
      region,
      ownerCreds,
      {
        deviceId,
      },
    );
    assert.strictEqual(
      ownerRes.status,
      200,
      `remove-device (owner) expected 200, got ${ownerRes.status}: ${ownerRes.body}`,
    );
    const gone = await this.getDeviceItem(tableName, deviceId);
    assert.strictEqual(
      gone,
      undefined,
      `Expected device ${deviceId} deleted by owner, but item still present: ${JSON.stringify(gone)}`,
    );
    console.log(
      `[4] remove-device gate: wrong-principal no-op (device retained), owner delete removed the item`,
    );
  };

  /**
   * 5. Guest path: sign identify-user with GUEST credentials -> 200; the same
   *    routes work for an unauthenticated identityId.
   */
  private assertGuestIdentifyUser = async (
    endpoint: string,
    region: string,
    domainName: string,
    guestCreds: IamCredentials,
    guestId: string,
    run: string,
  ): Promise<void> => {
    const res = await this.signedPost(
      endpoint,
      '/identify-user',
      region,
      guestCreds,
      {
        userProfile: {
          location: { region: 'OR' },
          customAttributes: { seg: `g-${run}` },
        },
      },
    );
    assert.strictEqual(
      res.status,
      200,
      `identify-user (guest) expected 200, got ${res.status}: ${res.body}`,
    );

    const profile = await this.pollProfile(domainName, guestId);
    assert.ok(
      profile,
      `No Customer Profile found for guest principalId ${guestId}`,
    );
    assert.strictEqual(
      profile.Attributes?.principalId,
      guestId,
      `Expected guest Attributes.principalId === ${guestId}, got ${profile.Attributes?.principalId}`,
    );
    console.log(
      `[5] identify-user(guest) 200; profile Attributes.principalId=${profile.Attributes?.principalId}`,
    );
  };

  /**
   * 6. SECURITY REGRESSION: signed identify-user carrying a reserved
   *    `customAttributes.principalId` is REJECTED with 400, and the caller's
   *    profile Attributes.principalId is UNCHANGED (never the injected value) —
   *    proving the reserved-key reject+strip fix holds end-to-end.
   */
  private assertPrincipalIdInjectionRejected = async (
    endpoint: string,
    region: string,
    domainName: string,
    creds: IamCredentials,
    identityId: string,
    run: string,
  ): Promise<void> => {
    const injected = `victim-${run}-${shortUuid()}`;
    const res = await this.signedPost(
      endpoint,
      '/identify-user',
      region,
      creds,
      {
        userProfile: {
          customAttributes: { principalId: injected },
        },
      },
    );
    assert.strictEqual(
      res.status,
      400,
      `principalId-injection identify-user expected 400 rejection, got ${res.status}: ${res.body}`,
    );

    // Belt-and-suspenders: the caller's profile still maps to its own identityId
    // (set in assertion 1), never the injected value.
    const profile = await this.pollProfile(domainName, identityId);
    assert.ok(
      profile,
      `No Customer Profile found for principalId ${identityId}`,
    );
    assert.strictEqual(
      profile.Attributes?.principalId,
      identityId,
      `Expected Attributes.principalId still ${identityId}, got ${profile.Attributes?.principalId}`,
    );

    // And no profile was ever created for the injected value.
    const injectedProfile = await this.searchProfile(domainName, injected);
    assert.strictEqual(
      injectedProfile,
      undefined,
      `Expected NO profile for injected principalId ${injected}, but one was found`,
    );
    console.log(
      `[6] principalId-injection REJECTED with 400 "${this.parseMessage(res.body)}"; Attributes.principalId unchanged (${profile.Attributes?.principalId}); no profile for injected value`,
    );
  };

  /**
   * A2. Server-side validation is authoritative over the signed API: an
   *     over-length customAttributes value, a register-device with an empty
   *     token, and a malformed JSON body are each REJECTED with 400 and a
   *     generic (PII-safe) message. No profile/device side effect occurs.
   */
  private assertServerValidationRejections = async (
    endpoint: string,
    region: string,
    domainName: string,
    tableName: string,
    creds: IamCredentials,
    identityId: string,
    run: string,
  ): Promise<void> => {
    // (i) over-length customAttributes value -> 400, no mutation of the profile.
    const overLong = 'a'.repeat(256);
    const overLongRes = await this.signedPost(
      endpoint,
      '/identify-user',
      region,
      creds,
      { userProfile: { customAttributes: { big: overLong } } },
    );
    assert.strictEqual(
      overLongRes.status,
      400,
      `over-length customAttributes expected 400, got ${overLongRes.status}: ${overLongRes.body}`,
    );
    const overLongMsg = this.parseMessage(overLongRes.body);
    assert.ok(
      overLongMsg.includes('customAttributes'),
      `Expected a customAttributes validation message, got "${overLongMsg}"`,
    );
    assert.ok(
      !overLongRes.body.includes(overLong),
      'Validation message must not echo the submitted (PII-adjacent) value',
    );
    // No side effect: the profile from assertion 1 is unchanged (seg still 'x').
    const profileAfter = await this.pollProfile(domainName, identityId);
    assert.strictEqual(
      profileAfter?.Attributes?.seg,
      'x',
      `Expected profile unchanged (Attributes.seg === 'x') after rejected call, got ${profileAfter?.Attributes?.seg}`,
    );

    // (ii) register-device with an empty token -> 400, no device written.
    const emptyTokenDeviceId = `notif-e2e-badtoken-${run}`;
    const emptyTokenRes = await this.signedPost(
      endpoint,
      '/register-device',
      region,
      creds,
      {
        device: {
          token: '',
          deviceId: emptyTokenDeviceId,
          platform: 'ios',
          channelType: 'APNS',
        },
      },
    );
    assert.strictEqual(
      emptyTokenRes.status,
      400,
      `empty-token register-device expected 400, got ${emptyTokenRes.status}: ${emptyTokenRes.body}`,
    );
    const emptyTokenMsg = this.parseMessage(emptyTokenRes.body);
    assert.ok(
      emptyTokenMsg.toLowerCase().includes('token'),
      `Expected a token validation message, got "${emptyTokenMsg}"`,
    );
    const noDevice = await this.getDeviceItem(tableName, emptyTokenDeviceId);
    assert.strictEqual(
      noDevice,
      undefined,
      `Expected NO device written for rejected empty-token register, got ${JSON.stringify(noDevice)}`,
    );

    // (iii) malformed JSON body -> 400.
    const malformedRes = await this.signedPostRaw(
      endpoint,
      '/identify-user',
      region,
      creds,
      '{ this is not json',
    );
    assert.strictEqual(
      malformedRes.status,
      400,
      `malformed JSON body expected 400, got ${malformedRes.status}: ${malformedRes.body}`,
    );

    console.log(
      `[A2] server validation rejections: over-length CA -> 400 "${overLongMsg}" (no mutation), empty token -> 400 "${emptyTokenMsg}" (no device), malformed JSON -> 400 "${this.parseMessage(malformedRes.body)}"`,
    );
  };

  /**
   * A3. remove-device for a deviceId that does not exist is a benign idempotent
   *     no-op (200) with no unintended deletion.
   */
  private assertBenignRemoveMissingDevice = async (
    endpoint: string,
    region: string,
    tableName: string,
    creds: IamCredentials,
    run: string,
  ): Promise<void> => {
    const missingDeviceId = `notif-e2e-missing-${run}`;
    // Precondition: the device genuinely does not exist.
    const before = await this.getDeviceItem(tableName, missingDeviceId);
    assert.strictEqual(
      before,
      undefined,
      `Precondition failed: device ${missingDeviceId} unexpectedly exists`,
    );

    const res = await this.signedPost(
      endpoint,
      '/remove-device',
      region,
      creds,
      { deviceId: missingDeviceId },
    );
    assert.strictEqual(
      res.status,
      200,
      `remove-device (missing) expected 200 no-op, got ${res.status}: ${res.body}`,
    );

    const after = await this.getDeviceItem(tableName, missingDeviceId);
    assert.strictEqual(
      after,
      undefined,
      `Expected device ${missingDeviceId} to remain absent after benign remove`,
    );
    console.log(
      `[A3] remove-device(missing) 200 benign no-op; device stays absent`,
    );
  };

  /**
   * SigV4-sign a POST to `{endpoint}{path}` for `execute-api` with the given
   * Identity Pool IAM credentials and send it via fetch.
   */
  private signedPost = async (
    endpoint: string,
    path: string,
    region: string,
    credentials: IamCredentials,
    body: unknown,
  ): Promise<SignedResponse> =>
    this.signedPostRaw(
      endpoint,
      path,
      region,
      credentials,
      JSON.stringify(body),
    );

  /**
   * Like {@link signedPost} but sends a RAW string body (used to exercise the
   * malformed-JSON rejection path). Signs the exact bytes that are sent.
   */
  private signedPostRaw = async (
    endpoint: string,
    path: string,
    region: string,
    credentials: IamCredentials,
    payload: string,
  ): Promise<SignedResponse> => {
    const url = new URL(`${endpoint}${path}`);
    const request = new HttpRequest({
      method: 'POST',
      protocol: url.protocol,
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        host: url.hostname,
        'content-type': 'application/json',
      },
      body: payload,
    });

    const signer = new SignatureV4({
      service: 'execute-api',
      region,
      credentials,
      sha256: Sha256,
    });
    const signed = await signer.sign(request);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: signed.headers,
      body: payload,
    });
    return { status: res.status, body: await res.text() };
  };

  /**
   * Poll SearchProfiles for the profile bound to `principalId`, absorbing the
   * service's eventual consistency with a bounded backoff.
   */
  private pollProfile = async (
    domainName: string,
    principalId: string,
    attempts: number = 10,
    baseDelayMs: number = 500,
  ): Promise<Profile | undefined> => {
    for (let i = 0; i < attempts; i++) {
      const found = await this.searchProfile(domainName, principalId);
      if (found) {
        return found;
      }
      if (i < attempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, baseDelayMs * (i + 1)),
        );
      }
    }
    return undefined;
  };

  private searchProfile = async (
    domainName: string,
    principalId: string,
  ): Promise<Profile | undefined> => {
    const search = await this.customerProfilesClient.send(
      new SearchProfilesCommand({
        DomainName: domainName,
        KeyName: PRINCIPAL_ID_KEY,
        Values: [principalId],
      }),
    );
    return search.Items?.find((item) => !!item.ProfileId);
  };

  private getDeviceItem = async (
    tableName: string,
    deviceId: string,
  ): Promise<Record<string, AttributeValue> | undefined> => {
    const res = await this.dynamoDBClient.send(
      new GetItemCommand({
        TableName: tableName,
        Key: { deviceId: { S: deviceId } },
        ConsistentRead: true,
      }),
    );
    return res.Item;
  };

  private parseMessage = (body: string): string => {
    try {
      return (JSON.parse(body) as { message?: string }).message ?? body;
    } catch {
      return body;
    }
  };
}
