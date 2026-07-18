import * as path from 'path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  Arn,
  ArnFormat,
  CfnOutput,
  CustomResource,
  Duration,
  RemovalPolicy,
  Stack,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Provider } from 'aws-cdk-lib/custom-resources';
import {
  CfnDomain,
  CfnIntegration,
  CfnObjectType,
} from 'aws-cdk-lib/aws-customerprofiles';
import {
  CfnInstance,
  CfnIntegrationAssociation,
} from 'aws-cdk-lib/aws-connect';
import { CfnKnowledgeBase } from 'aws-cdk-lib/aws-wisdom';
import {
  CfnAPNSChannel,
  CfnAPNSSandboxChannel,
  CfnApp,
  CfnGCMChannel,
} from 'aws-cdk-lib/aws-pinpoint';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import {
  HttpIamAuthorizer,
  HttpJwtAuthorizer,
} from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { ResourceProvider, StackProvider } from '@aws-amplify/plugin-types';

import {
  CONNECT_CAMPAIGNS_SERVICE_NAME,
  CONNECT_INVOKE_SERVICE_PRINCIPALS,
  DEFAULT_EXPIRATION_DAYS,
  DEVICES_TABLE_GSI_PROFILE_ID,
  ENV_DEVICES_TABLE_NAME,
  ENV_DOMAIN_NAME,
  ENV_EUM_APPLICATION_ID,
  GUEST_EXPIRATION_DAYS,
} from './constants.js';
import {
  AMPLIFY_GUEST_PROFILE_FIELDS,
  AMPLIFY_GUEST_PROFILE_KEYS,
  AMPLIFY_PROFILE_FIELDS,
  AMPLIFY_PROFILE_KEYS,
  OBJECT_TYPE_NAMES,
} from './object_types.js';

/**
 * The pre-bundled identify-user Lambda asset ships alongside the compiled
 * construct at `<packageRoot>/lib/handler-asset` (produced by the package's
 * `post:compile` esbuild step). Resolving relative to the package root — rather
 * than to this module — means the path is correct whether the code runs from
 * the compiled `lib/` output or from `src/` under `tsx` (as the unit tests do).
 */
const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const defaultLambdaCodePath = path.join(packageRoot, 'lib', 'handler-asset');
const defaultPushLambdaCodePath = path.join(
  packageRoot,
  'lib',
  'push-handler-asset',
);
const defaultCampaignAssociationLambdaCodePath = path.join(
  packageRoot,
  'lib',
  'campaign-association-asset',
);

/** CDK resources exposed by {@link AmplifyNotifications}. */
export type NotificationsResources = {
  /** The identify-user Lambda function. */
  identifyUserFunction: lambda.IFunction;
  /** The HTTP API fronting the identify-user route. */
  httpApi: apigwv2.HttpApi;
  /** The AmplifyProfile object type registered on the domain. */
  profileObjectType: CfnObjectType;
  /** The AmplifyGuestProfile object type registered on the domain. */
  guestProfileObjectType: CfnObjectType;
  /**
   * The DynamoDB Devices table — the authoritative, strongly-consistent device
   * store (PK = deviceId, GSI on profileId, native TTL on `ttl`).
   */
  devicesTable: dynamodb.ITable;
  /**
   * The push-delivery Lambda function, wired as the target of a Connect Journey
   * Custom-action (Invoke Lambda).
   */
  pushFunction: lambda.IFunction;
  /** The AWS End User Messaging / Pinpoint application backing push delivery. */
  pushApplication: CfnApp;
  /**
   * The APNs channel enabled on the push application, when `apnsChannel` is
   * configured. `undefined` when no APNs configuration was provided. Either the
   * production (`CfnAPNSChannel`) or sandbox (`CfnAPNSSandboxChannel`) channel,
   * depending on `apnsChannel.sandbox`.
   */
  apnsChannel?: CfnAPNSChannel | CfnAPNSSandboxChannel;
  /**
   * The GCM/FCM channel enabled on the push application, when `fcmChannel` is
   * configured. `undefined` when no FCM configuration was provided.
   */
  gcmChannel?: CfnGCMChannel;
  /**
   * The Amazon Connect instance created in create-from-scratch mode (when
   * `domainName` is omitted). `undefined` in attach mode.
   */
  connectInstance?: CfnInstance;
  /**
   * The Customer Profiles domain created in create-from-scratch mode (when
   * `domainName` is omitted). `undefined` in attach mode, where the object types
   * are registered into a pre-existing domain the construct does not own.
   */
  profilesDomain?: CfnDomain;
};

export type AmplifyNotificationsProps = {
  /**
   * The JWT issuer URL the HTTP API authorizer trusts. For a Cognito user pool
   * this is `https://cognito-idp.<region>.amazonaws.com/<userPoolId>`.
   */
  readonly jwtIssuer: string;

  /**
   * Allowed JWT audiences. For a Cognito user pool this is the app client id(s)
   * (matched against `aud` for id tokens / `client_id` for access tokens).
   */
  readonly jwtAudience: string[];

  /**
   * Name of an EXISTING Customer Profiles domain to attach to — e.g. the domain
   * Amazon Connect auto-creates when Customer Profiles is enabled on an
   * instance. When provided, the construct runs in ATTACH mode: it registers the
   * AmplifyProfile / AmplifyDevice object types INTO this domain and never
   * creates an instance or a domain.
   *
   * OMIT this to run in the default CREATE-FROM-SCRATCH mode: the construct
   * provisions a brand-new Amazon Connect instance AND a brand-new Customer
   * Profiles domain (with generated, stable names) and wires everything into
   * that new domain — so a caller needs zero pre-existing Connect setup.
   */
  readonly domainName?: string;

  /**
   * CREATE mode only: override the auto-generated Amazon Connect instance alias.
   * Ignored in attach mode. When omitted, a deterministic-yet-unique alias is
   * derived from the construct's scope so it is stable across deploy/delete and
   * unique per app. Lowercase alphanumeric characters + hyphens; must not start
   * with
   * `d-`.
   */
  readonly instanceAlias?: string;

  /**
   * Override the directory containing the pre-bundled Lambda asset (an
   * `index.js` exporting `handler`). Defaults to the handler bundled inside this
   * package (`lib/handler-asset`, produced by `post:compile`).
   */
  readonly lambdaCodePath?: string;

  /** Profile / object-type expiration in days. Default: 366. */
  readonly expirationDays?: number;

  /**
   * GUEST profile / object-type expiration in days. Guest profiles are reaped
   * purely by this Customer Profiles TTL (no reaper Lambda needed); deliberately
   * shorter than `expirationDays` because an unauthenticated identity is
   * ephemeral. Default: 90.
   */
  readonly guestExpirationDays?: number;

  /**
   * Override the directory containing the pre-bundled push Lambda asset (an
   * `index.js` exporting `handler`). Defaults to the handler bundled inside this
   * package (`lib/push-handler-asset`, produced by `post:compile`).
   */
  readonly pushLambdaCodePath?: string;

  /**
   * Override the directory containing the pre-bundled campaign-association
   * custom-resource Lambda asset (an `index.js` exporting `handler`). Defaults to
   * the handler bundled inside this package (`lib/campaign-association-asset`,
   * produced by `post:compile`). Only used in create-from-scratch mode.
   */
  readonly campaignAssociationLambdaCodePath?: string;

  /**
   * OPTIONAL APNs channel configuration (token / `.p8` auth). When provided, the
   * construct enables the APNs channel on the created End User Messaging
   * (Pinpoint) application. All values are plain strings — the Amplify Gen2
   * factory resolves the `.p8` key from an Amplify `secret()` before passing it
   * here, keeping this construct framework-agnostic. When omitted, no APNs
   * channel is configured.
   */
  readonly apnsChannel?: {
    /** The APNs token signing key contents (the `AuthKey_<keyId>.p8` file). */
    readonly tokenKey: string;
    /** The 10-character key identifier assigned to the APNs signing key. */
    readonly keyId: string;
    /** The Apple Developer account team identifier. */
    readonly teamId: string;
    /** The iOS app bundle identifier. */
    readonly bundleId: string;
    /**
     * Configure the APNs **sandbox** channel instead of the production channel.
     * @default false
     */
    readonly sandbox?: boolean;
  };

  /**
   * OPTIONAL FCM/GCM channel configuration (FCM HTTP v1 auth). When provided, the
   * construct enables the GCM channel on the created End User Messaging
   * (Pinpoint) application. The value is a plain string — the Amplify Gen2
   * factory resolves the service-account JSON from an Amplify `secret()` before
   * passing it here. When omitted, no GCM channel is configured.
   */
  readonly fcmChannel?: {
    /** The FCM HTTP v1 service-account JSON credential contents. */
    readonly serviceJson: string;
  };
};

/**
 * Amazon Connect Customer Profiles backend for the identifyUser contract,
 * packaged as an AWS CDK construct. Provisions:
 *   - AmplifyProfile object type: searchable `cognitoUserKey` (PROFILE + UNIQUE)
 *     identity key + person / targeting attribute schema.
 *   - AmplifyDevice object type: PROFILE-resolution key = `cognitoUserKey`,
 *     UNIQUE object key = stable `deviceId`; device fields stored raw.
 *   - identify-user Lambda with least-privilege profile:* on this domain only.
 *   - HTTP API + JWT authorizer bound to the supplied issuer / audience.
 *   - push-delivery Lambda (Connect Journey Custom-action target) + a minimal
 *     AWS End User Messaging (Pinpoint) application for `SendMessages`.
 *
 * It operates in one of two modes, chosen by whether `domainName` is provided:
 *
 *   - CREATE-FROM-SCRATCH (default, `domainName` omitted): the construct also
 *     provisions a brand-new Amazon Connect instance (`AWS::Connect::Instance`,
 *     CONNECT_MANAGED, inbound/outbound enabled) AND a brand-new Customer
 *     Profiles domain (`AWS::CustomerProfiles::Domain`) with generated, stable
 *     names, then registers the object types INTO that new domain. The object
 *     types depend on the created domain so they provision after it and are torn
 *     down before it. A caller needs zero pre-existing Connect setup.
 *   - ATTACH (`domainName` provided): the construct registers the two object
 *     types INTO the existing `domainName` (additive) — such as the domain
 *     Amazon Connect auto-creates when Customer Profiles is enabled on an
 *     instance — WITHOUT creating an instance or a domain, and without touching
 *     the domain's other integrations (CTR, Outbound Campaigns) or its Identity
 *     Resolution setting.
 *
 * In either mode, identify works against the domain standalone. Outbound
 * Campaigns association — so journeys can target these profiles — is AUTOMATIC
 * in create-from-scratch mode (a Lambda-backed custom resource associates the
 * new domain with the new instance's Outbound Campaigns v2 at deploy time). In
 * attach mode, associating the pre-existing domain is the user's responsibility
 * and is left untouched.
 *
 * This construct is framework-agnostic (aws-cdk-lib + constructs only). The
 * `defineNotifications` factory wraps it for Amplify Gen2 backends, wiring the
 * JWT authorizer to the app's Cognito user pool and surfacing the endpoint via
 * backend outputs.
 */
export class AmplifyNotifications
  extends Construct
  implements ResourceProvider<NotificationsResources>, StackProvider
{
  /** CDK resources for lower-level access. */
  public readonly resources: NotificationsResources;
  /** The stack this construct belongs to. */
  public readonly stack: Stack;
  /** Base invoke URL. Clients call `POST {apiEndpoint}/identify-user`. */
  public readonly apiEndpoint: string;
  /** The route path appended to {@link apiEndpoint}. */
  public readonly identifyUserPath = '/identify-user';
  /**
   * The GUEST route path appended to {@link apiEndpoint}.
   * IAM/SigV4-authorized; unauthenticated Identity Pool callers sign requests to
   * `POST {apiEndpoint}/identify-user-guest`.
   */
  public readonly guestIdentifyUserPath = '/identify-user-guest';
  /**
   * The `execute-api:Invoke` ARN of the GUEST route, to
   * grant to the app's Cognito Identity Pool UNAUTHENTICATED role so guests can
   * call the route. Scoped to POST on the guest path of this API's default
   * stage.
   */
  public readonly guestRouteInvokeArn!: string;
  /** The Customer Profiles domain name the object types are registered into. */
  public readonly domainName: string;
  /**
   * `true` when this construct created the Customer Profiles domain + Connect
   * instance (create-from-scratch mode); `false` when it attached to an existing
   * domain named by `domainName`.
   */
  public readonly createsResources: boolean;
  /**
   * Id of the Amazon Connect instance created in create-from-scratch mode.
   * `undefined` in attach mode.
   */
  public readonly connectInstanceId?: string;
  /**
   * ARN of the Amazon Connect instance created in create-from-scratch mode.
   * `undefined` in attach mode.
   */
  public readonly connectInstanceArn?: string;
  /**
   * ARN of the push-delivery Lambda, to wire as a Connect Journey Custom-action
   * (Invoke Lambda) target.
   */
  public readonly pushFunctionArn: string;
  /**
   * The AWS End User Messaging / Pinpoint application id this construct created
   * and the push Lambda calls `SendMessages` against.
   */
  public readonly eumApplicationId: string;

  /**
   * Registers the AmplifyProfile / AmplifyDevice object types into the Customer
   * Profiles domain (created here in create-from-scratch mode, or the existing
   * `domainName` in attach mode), the identify-user Lambda + JWT-authorized HTTP
   * API, and the push-delivery Lambda + AWS End User Messaging application for
   * this notifications backend.
   */
  constructor(scope: Construct, id: string, props: AmplifyNotificationsProps) {
    super(scope, id);

    const stack = Stack.of(this);
    this.stack = stack;
    const expirationDays = props.expirationDays ?? DEFAULT_EXPIRATION_DAYS;
    const guestExpirationDays =
      props.guestExpirationDays ?? GUEST_EXPIRATION_DAYS;

    const createFromScratch = !props.domainName;
    this.createsResources = createFromScratch;

    let domainName: string;
    let profilesDomain: CfnDomain | undefined;
    let connectInstance: CfnInstance | undefined;
    let templatesKb: CfnKnowledgeBase | undefined;

    if (createFromScratch) {
      // Deterministic-yet-unique base name derived from the construct's scope so
      // it is STABLE across deploy/delete (same tree → same name) and unique per
      // app / environment (the root stack name embeds the Amplify app + branch).
      const baseName = this.generateResourceName();
      domainName = baseName;

      connectInstance = new CfnInstance(this, 'ConnectInstance', {
        // Minimal telephony surface: Connect requires at least one of
        // inbound/outbound; enable both so the instance is usable for outbound
        // journeys later. Directory is Connect-managed (no external identity).
        //
        // highVolumeOutBound enables the instance's Outbound Campaigns feature.
        // This is what makes Amazon Connect attach the
        // `HighVolumeOutboundCommunicationAccess` inline policy to the instance's
        // OWN service-linked role — the policy granting the `connect-campaigns:*`
        // (CreateCampaign / ListCampaigns / ...) actions the Connect console
        // drives Journey + campaign authoring through. Onboarding to Outbound
        // Campaigns v2 (the campaign-association custom resource) does NOT set
        // it, so without this the console's Journey / segment builder fails with
        // connect-campaigns AccessDenied on the instance SLR.
        attributes: {
          inboundCalls: true,
          outboundCalls: true,
          highVolumeOutBound: true,
        },
        identityManagementType: 'CONNECT_MANAGED',
        instanceAlias: this.sanitizeInstanceAlias(
          props.instanceAlias ?? baseName,
        ),
      });

      profilesDomain = new CfnDomain(this, 'ProfilesDomain', {
        domainName,
        defaultExpirationDays: expirationDays,
      });

      this.connectInstanceId = connectInstance.attrId;
      this.connectInstanceArn = connectInstance.attrArn;

      // Instance-level Customer Profiles feature binding: registers the created
      // domain as the instance's CTR (contact-record) profiles store — the
      // "Customer Profiles enabled" integration the Connect console and Journey
      // segment builder require, distinct from the Outbound Campaigns
      // integration the association custom resource wires below. PutIntegration
      // auto-resolves the Connect service-linked role for a connect-instance
      // URI; that SLR can only reach the domain because it is named
      // `amazon-connect-*` (see generateResourceName).
      const ctrIntegration = new CfnIntegration(
        this,
        'ConnectProfilesIntegration',
        {
          domainName,
          uri: connectInstance.attrArn,
          objectTypeName: 'CTR',
        },
      );
      ctrIntegration.addDependency(connectInstance);
      ctrIntegration.addDependency(profilesDomain);

      // Message-templates knowledge base + its instance association. Both the
      // Connect console's message-template authoring UI and the push-delivery
      // Lambda's runtime discovery (ListIntegrationAssociations filtered to
      // Q_MESSAGE_TEMPLATES → the KB it renders templates from) require a
      // MESSAGE_TEMPLATES knowledge base linked to the instance. We provision
      // the empty KB + the Q_MESSAGE_TEMPLATES association only; the templates
      // themselves are the marketer's job (a template's name must match the
      // journey Custom-action id, e.g. "Push Notification"). A MESSAGE_TEMPLATES
      // KB needs no Q assistant. The name is derived from the same deterministic
      // base as the instance/domain so redeploys stay stable and avoid the
      // CreateKnowledgeBase ConflictException on duplicate names.
      templatesKb = new CfnKnowledgeBase(this, 'MessageTemplatesKb', {
        name: `${baseName}-message-templates`,
        knowledgeBaseType: 'MESSAGE_TEMPLATES',
      });

      const templatesAssociation = new CfnIntegrationAssociation(
        this,
        'MessageTemplatesAssociation',
        {
          instanceId: connectInstance.attrArn,
          integrationType: 'Q_MESSAGE_TEMPLATES',
          integrationArn: templatesKb.attrKnowledgeBaseArn,
        },
      );
      templatesAssociation.addDependency(connectInstance);
      templatesAssociation.addDependency(templatesKb);
    } else {
      domainName = props.domainName as string;
    }
    this.domainName = domainName;

    // ---- Object types ------------------------------------------------------
    // Registered INTO `domainName`. In attach mode this is purely additive to a
    // pre-existing (e.g. Connect-managed) domain. In create mode the object
    // types depend on the domain created above, so CFN provisions the domain
    // first and — on teardown — removes the object types before the domain (a
    // clean, in-construct dependency; no cross-stack ordering hack needed).
    const profileType = new CfnObjectType(this, 'AmplifyProfileType', {
      domainName,
      objectTypeName: OBJECT_TYPE_NAMES.profile,
      description:
        'Amplify identifyUser person profile (find-or-create by verified Cognito sub)',
      allowProfileCreation: true,
      fields: AMPLIFY_PROFILE_FIELDS,
      keys: AMPLIFY_PROFILE_KEYS,
      expirationDays,
    });

    // ---- Devices table (authoritative device store) -----------------------
    // DynamoDB is the SINGLE SOURCE OF TRUTH for device ownership: PK = the
    // stable per-install deviceId, so a physical device lives on exactly one
    // profile at any instant. Register/re-home is a strongly-consistent
    // last-writer-wins UpdateItem on the PK (overwriting IS the eviction), and
    // delivery gates on a strongly-consistent point read of the same PK — no
    // eventual-consistency window in the correctness path. The GSI on profileId
    // is enumeration-only (eventually consistent). Native TTL on `ttl` reaps
    // stale device records without a reaper Lambda.
    const devicesTable = new dynamodb.Table(this, 'DevicesTable', {
      partitionKey: {
        name: 'deviceId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      pointInTimeRecovery: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    devicesTable.addGlobalSecondaryIndex({
      indexName: DEVICES_TABLE_GSI_PROFILE_ID,
      partitionKey: {
        name: 'profileId',
        type: dynamodb.AttributeType.STRING,
      },
      // Only the base-table key (deviceId) is needed from the GSI; the
      // authoritative record is then point-read on the PK.
      projectionType: dynamodb.ProjectionType.KEYS_ONLY,
    });

    // A distinct object type for GUEST profiles. Customer
    // Profiles permits exactly one UNIQUE key per object type and PutProfileObject
    // requires the ingested object to carry it; the authed AmplifyProfile reserves
    // its UNIQUE key for cognitoSub, so guest profiles (keyed on the Identity Pool
    // cognitoIdentityId) get their own type with cognitoIdentityKey as UNIQUE.
    const guestProfileType = new CfnObjectType(
      this,
      'AmplifyGuestProfileType',
      {
        domainName,
        objectTypeName: OBJECT_TYPE_NAMES.guestProfile,
        description:
          'Amplify identifyUser GUEST person profile (find-or-create by verified Cognito Identity Pool identityId)',
        allowProfileCreation: true,
        fields: AMPLIFY_GUEST_PROFILE_FIELDS,
        keys: AMPLIFY_GUEST_PROFILE_KEYS,
        // Guests get their OWN shorter TTL: Customer Profiles TTL applies to the
        // whole profile, so this reaps stale guest profiles with no reaper.
        expirationDays: guestExpirationDays,
      },
    );

    if (profilesDomain) {
      profileType.addDependency(profilesDomain);
      guestProfileType.addDependency(profilesDomain);
    }

    // ---- Outbound Campaigns association (create-from-scratch ONLY) ----------
    // When this construct created the instance + domain, a Lambda-backed custom
    // resource associates the new domain with the instance's Outbound Campaigns
    // v2 at deploy time — so Connect Journeys can target the domain's profiles
    // with NO manual console step. In attach mode the existing domain's
    // association is the user's responsibility, so this resource is NOT added.
    if (createFromScratch && connectInstance && profilesDomain) {
      this.addCampaignAssociation(
        connectInstance,
        profilesDomain,
        domainName,
        props.campaignAssociationLambdaCodePath ??
          defaultCampaignAssociationLambdaCodePath,
      );
    }

    // ---- Lambda handler ----------------------------------------------------
    // Pre-bundled at build time (esbuild) into a self-contained asset, so the
    // construct works regardless of the consuming project's root (Amplify's
    // NodejsFunction guardrail forbids an entry outside the app root).
    const codePath = props.lambdaCodePath ?? defaultLambdaCodePath;

    const fn = new lambda.Function(this, 'IdentifyUserFn', {
      code: lambda.Code.fromAsset(codePath),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.seconds(15),
      memorySize: 256,
      environment: {
        [ENV_DOMAIN_NAME]: domainName,
        [ENV_DEVICES_TABLE_NAME]: devicesTable.tableName,
      },
    });

    // ---- Least-privilege IAM ----------------------------------------------
    const domainArn = Arn.format(
      {
        service: 'profile',
        resource: 'domains',
        resourceName: domainName,
        arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      },
      stack,
    );
    const objectTypesArn = Arn.format(
      {
        service: 'profile',
        resource: 'domains',
        resourceName: `${domainName}/object-types/*`,
        arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      },
      stack,
    );
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          // PutProfileObject find-or-create (AmplifyProfile).
          'profile:PutProfileObject',
          'profile:SearchProfiles',
          // Set targeting / person attributes (incl. hasAPNS/hasGCM/platform)
          // on the resolved profile.
          'profile:UpdateProfile',
        ],
        resources: [domainArn, objectTypesArn],
      }),
    );
    // Device ownership is authoritative in DynamoDB: register/re-home is a
    // strongly-consistent last-writer-wins UpdateItem on the deviceId PK.
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:UpdateItem',
          'dynamodb:GetItem',
          'dynamodb:PutItem',
        ],
        resources: [devicesTable.tableArn],
      }),
    );

    // ---- HTTP API + JWT authorizer ----------------------------------------
    const authorizer = new HttpJwtAuthorizer('JwtAuthorizer', props.jwtIssuer, {
      jwtAudience: props.jwtAudience,
      identitySource: ['$request.header.Authorization'],
    });

    const httpApi = new apigwv2.HttpApi(this, 'IdentifyUserApi', {
      apiName: 'identify-user-api',
      createDefaultStage: true,
    });

    httpApi.addRoutes({
      path: this.identifyUserPath,
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('IdentifyUserIntegration', fn),
      authorizer,
    });

    // ---- Guest (unauthenticated) route ------------------------------------
    // A second route to the SAME identify Lambda, but
    // authorized with IAM/SigV4 instead of a JWT — so an UNAUTHENTICATED Cognito
    // Identity Pool caller (guest credentials) can register a device / seed a
    // profile BEFORE login (the pre-login push-token case).
    //
    // The integration MUST use payload format 1.0: HTTP API payload format 2.0
    // has NO `requestContext.identity` block, so the verified Cognito
    // `cognitoIdentityId` (+ `cognitoAuthenticationType`) the Lambda keys the
    // guest profile on is only present under format 1.0. The Lambda derives the
    // guest identity SOLELY from that authorizer-verified field.
    const iamAuthorizer = new HttpIamAuthorizer();
    httpApi.addRoutes({
      path: this.guestIdentifyUserPath,
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('GuestIdentifyIntegration', fn, {
        payloadFormatVersion: apigwv2.PayloadFormatVersion.VERSION_1_0,
      }),
      authorizer: iamAuthorizer,
    });

    // `execute-api:Invoke` ARN for the guest route — the app grants this to its
    // Identity Pool UNAUTHENTICATED role so guests can call the route. Scoped as
    // tightly as execute-api allows: `$default/POST/identify-user-guest` pins the
    // grant to the POST method on the guest path of the API's single default
    // stage, so the unauth role can invoke NEITHER other methods, NOR other
    // stages, NOR the authed `/identify-user` route. (HTTP APIs auto-create the
    // `$default` stage; this construct never adds another.)
    this.guestRouteInvokeArn = Arn.format(
      {
        service: 'execute-api',
        resource: httpApi.apiId,
        resourceName: `$default/POST${this.guestIdentifyUserPath}`,
        arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      },
      stack,
    );

    this.apiEndpoint = httpApi.apiEndpoint;

    // Scoped to the stack (not `this`) so the output keeps a stable, readable
    // logical id (`IdentifyUserApiEndpoint`) that a human can find in the
    // CloudFormation console. The construct is provisioned once per stack (the
    // Gen2 factory places it in a dedicated nested stack), so there is no
    // collision risk from the verbatim id.
    new CfnOutput(stack, 'IdentifyUserApiEndpoint', {
      value: httpApi.apiEndpoint,
      description: 'POST {value}/identify-user',
    });

    // Surface the guest route's invoke ARN so a human /
    // the app can grant it to the Identity Pool unauthenticated role.
    new CfnOutput(stack, 'GuestIdentifyRouteInvokeArn', {
      value: this.guestRouteInvokeArn,
      description:
        'Grant execute-api:Invoke on this ARN to the Cognito Identity Pool unauthenticated role',
    });

    // ---- Push-delivery path -----------------------------------------------
    // Amazon Connect has no native mobile-push channel, so a Lambda bridges the
    // gap: Connect invokes it via a Journey Custom-action to deliver push
    // through AWS End User Messaging (Pinpoint SendMessages). A minimal Pinpoint
    // application is always created so SendMessages has a valid ApplicationId.
    // The APNs / GCM channels on it are configured only when the caller supplies
    // credentials (see `apnsChannel` / `fcmChannel`); otherwise the application
    // is created with no channel enabled (delivery will 404 until configured).
    const pushApplication = new CfnApp(this, 'PushApp', {
      name: `${domainName}-push`,
    });
    const eumApplicationId = pushApplication.ref;
    this.eumApplicationId = eumApplicationId;

    // ---- Optional push channels (secret-driven) ---------------------------
    // The Amplify Gen2 factory resolves the APNs `.p8` key / FCM service-account
    // JSON from Amplify `secret()`s to deploy-time CFN tokens and passes them as
    // plain strings. Channel credentials flow through CloudFormation the same way
    // Amplify's own external-auth-provider secrets do (defineAuth) — via the
    // secret custom resource's token, never as literal template plain text. The
    // channels attach to THIS construct's own EUM app, so they are provisioned
    // after it and torn down with the stack. The `applicationId` prop resolves to
    // a `Ref` on the EUM app, so CloudFormation infers the create/delete ordering
    // — no explicit `addDependency` needed.
    const { apnsChannel: apnsConfig, fcmChannel: fcmConfig } = props;

    let apnsChannel: CfnAPNSChannel | CfnAPNSSandboxChannel | undefined;
    if (apnsConfig) {
      // Token (`.p8`) authentication: the CFN `DefaultAuthenticationMethod`
      // property accepts `TOKEN` (signing-key auth) or `CERTIFICATE`; token auth
      // uses the `.p8` signing key. Sandbox selects the development APNs endpoint
      // used by development-signed builds.
      const apnsProps = {
        applicationId: eumApplicationId,
        enabled: true,
        defaultAuthenticationMethod: 'TOKEN',
        tokenKey: apnsConfig.tokenKey,
        tokenKeyId: apnsConfig.keyId,
        teamId: apnsConfig.teamId,
        bundleId: apnsConfig.bundleId,
      };
      apnsChannel = apnsConfig.sandbox
        ? new CfnAPNSSandboxChannel(this, 'ApnsSandboxChannel', apnsProps)
        : new CfnAPNSChannel(this, 'ApnsChannel', apnsProps);
    }

    let gcmChannel: CfnGCMChannel | undefined;
    if (fcmConfig) {
      // FCM HTTP v1: `TOKEN` auth with a service-account JSON credential. Google
      // deprecated the legacy server-key (`ApiKey` / `KEY`) API, so only the v1
      // `ServiceJson` (FCM v1) path is used.
      gcmChannel = new CfnGCMChannel(this, 'GcmChannel', {
        applicationId: eumApplicationId,
        enabled: true,
        defaultAuthenticationMethod: 'TOKEN',
        serviceJson: fcmConfig.serviceJson,
      });
    }

    const pushCodePath = props.pushLambdaCodePath ?? defaultPushLambdaCodePath;
    const pushFn = new lambda.Function(this, 'PushHandlerFn', {
      code: lambda.Code.fromAsset(pushCodePath),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        [ENV_DEVICES_TABLE_NAME]: devicesTable.tableName,
        [ENV_EUM_APPLICATION_ID]: eumApplicationId,
      },
    });

    // Least-privilege device access on the authoritative DynamoDB Devices
    // table: enumerate a profile's devices via the GSI, gate ownership with a
    // strongly-consistent point read on the PK, and delete a dead-token record.
    pushFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['dynamodb:Query'],
        resources: [
          `${devicesTable.tableArn}/index/${DEVICES_TABLE_GSI_PROFILE_ID}`,
        ],
      }),
    );
    pushFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['dynamodb:GetItem', 'dynamodb:DeleteItem'],
        resources: [devicesTable.tableArn],
      }),
    );

    const appMessagesArn = Arn.format(
      {
        service: 'mobiletargeting',
        resource: 'apps',
        resourceName: `${eumApplicationId}/messages`,
        arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      },
      stack,
    );
    pushFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['mobiletargeting:SendMessages'],
        resources: [appMessagesArn],
      }),
    );

    // ---- Runtime message-template resolution (Q in Connect) ---------------
    // The push Lambda resolves per-profile copy from a Q in Connect (Wisdom)
    // PUSH message template at runtime: it discovers the knowledge base from the
    // journey's campaign (DescribeCampaign -> connectInstanceId ->
    // ListIntegrationAssociations) and renders the template whose name matches
    // the Custom-action ActionId. Least-privilege, scoped to this account /
    // region. IAM prefixes confirmed empirically: campaign actions use
    // `connect-campaigns`, integration listing uses `connect`, and Q in Connect
    // message-template actions use the `wisdom` prefix (Q in Connect is the
    // rebrand of Amazon Connect Wisdom; the SDK client is `@aws-sdk/client-qconnect`
    // but IAM/ARNs remain `wisdom`).
    pushFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['connect-campaigns:DescribeCampaign'],
        resources: [
          Arn.format(
            {
              service: 'connect-campaigns',
              resource: 'campaign',
              resourceName: '*',
              arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            },
            stack,
          ),
        ],
      }),
    );
    // `connect:ListIntegrationAssociations` and the Q in Connect
    // message-template actions are scoped to the SPECIFIC instance / knowledge
    // base this construct provisioned when in create-from-scratch mode. In
    // attach mode neither ARN is known at synth time (the instance / KB
    // pre-exist and are not passed in), so those actions fall back to an
    // account/region-scoped wildcard.
    const instanceWildcardArn = Arn.format(
      {
        service: 'connect',
        resource: 'instance',
        resourceName: '*',
        arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      },
      stack,
    );
    pushFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['connect:ListIntegrationAssociations'],
        resources:
          createFromScratch && connectInstance
            ? [connectInstance.attrArn]
            : [instanceWildcardArn],
      }),
    );
    const messageTemplateResources =
      createFromScratch && templatesKb
        ? [
            // ListMessageTemplates acts on the knowledge base; Get/Render act on
            // the templates UNDER it (message-template/<kbId>/<templateId>), so
            // scope to the created KB and every template within it.
            templatesKb.attrKnowledgeBaseArn,
            Arn.format(
              {
                service: 'wisdom',
                resource: 'message-template',
                resourceName: `${templatesKb.attrKnowledgeBaseId}/*`,
                arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
              },
              stack,
            ),
          ]
        : [
            Arn.format(
              {
                service: 'wisdom',
                resource: 'knowledge-base',
                resourceName: '*',
                arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
              },
              stack,
            ),
            Arn.format(
              {
                service: 'wisdom',
                resource: 'message-template',
                resourceName: '*',
                arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
              },
              stack,
            ),
          ];
    pushFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'wisdom:ListMessageTemplates',
          'wisdom:GetMessageTemplate',
          'wisdom:RenderMessageTemplate',
        ],
        resources: messageTemplateResources,
      }),
    );

    // ---- Invoke resource policy for Amazon Connect ------------------------
    // A Connect Journey Custom-action (and Outbound Campaigns v2) invokes this
    // Lambda through the connect / connect-campaigns service principal. Grant
    // lambda:InvokeFunction to both, scoped to THIS account (`sourceAccount`) so
    // only Connect instances in the deploying account — not any Connect instance
    // anywhere — can invoke it (confused-deputy guard). The Connect instance ARN
    // isn't known at synth time, so account scoping is the tightest guard here.
    for (const servicePrincipal of CONNECT_INVOKE_SERVICE_PRINCIPALS) {
      pushFn.addPermission(
        `Invoke-${servicePrincipal.replace(/[^a-zA-Z0-9]/g, '-')}`,
        {
          principal: new iam.ServicePrincipal(servicePrincipal),
          action: 'lambda:InvokeFunction',
          sourceAccount: stack.account,
        },
      );
    }

    this.pushFunctionArn = pushFn.functionArn;

    // Scoped to the stack (not `this`) so the output keeps a stable, readable
    // logical id (`PushHandlerFunctionArn`) that a human can find in the
    // CloudFormation console and copy to wire the Journey Custom-action.
    new CfnOutput(stack, 'PushHandlerFunctionArn', {
      value: pushFn.functionArn,
      description:
        'Wire as a Connect Journey Custom-action (Invoke Lambda) target',
    });

    // ---- Create-mode outputs ----------------------------------------------
    // Surface the resources this construct provisioned from scratch so a human
    // can find the new instance / domain in the console. Their Outbound
    // Campaigns association is handled automatically by the custom resource above.
    if (connectInstance) {
      new CfnOutput(stack, 'ConnectInstanceId', {
        value: connectInstance.attrId,
        description: 'Amazon Connect instance created for notifications',
      });
      new CfnOutput(stack, 'ConnectInstanceArn', {
        value: connectInstance.attrArn,
        description: 'Amazon Connect instance ARN',
      });
    }
    if (profilesDomain) {
      new CfnOutput(stack, 'ProfilesDomainName', {
        value: domainName,
        description: 'Customer Profiles domain created for notifications',
      });
    }

    this.resources = {
      identifyUserFunction: fn,
      httpApi,
      profileObjectType: profileType,
      guestProfileObjectType: guestProfileType,
      devicesTable,
      pushFunction: pushFn,
      pushApplication,
      apnsChannel,
      gcmChannel,
      connectInstance,
      profilesDomain,
    };
  }

  /**
   * Create-from-scratch ONLY: a Lambda-backed CDK custom resource that
   * associates the created Customer Profiles domain with the created Amazon
   * Connect instance's Outbound Campaigns v2 at deploy time, so Connect Journeys
   * can target the domain's profiles with no manual console step.
   *
   * A `custom-resources.Provider` fronts the handler because onboarding is
   * asynchronous: the handler starts the instance-onboarding job, then POLLS
   * GetInstanceOnboardingJobStatus until SUCCEEDED (an `AwsCustomResource` can't
   * poll). onCreate/onUpdate are idempotent; onDelete best-effort reverses the
   * integrations + offboards, never failing teardown. The resource depends on
   * both the instance and the domain so it runs after they exist and is torn
   * down before them.
   */
  private addCampaignAssociation(
    connectInstance: CfnInstance,
    profilesDomain: CfnDomain,
    domainName: string,
    codePath: string,
  ): void {
    const stack = this.stack;

    const associationFn = new lambda.Function(this, 'CampaignAssociationFn', {
      code: lambda.Code.fromAsset(codePath),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      // Onboarding polls GetInstanceOnboardingJobStatus until SUCCEEDED (~20s,
      // capped ~2min); allow generous headroom for onboarding + both integrations.
      timeout: Duration.minutes(10),
      memorySize: 256,
    });

    // These instance-onboarding / instance-integration actions operate on the
    // Connect instance's Outbound Campaigns configuration, not on a campaign
    // resource. connect-campaigns does NOT support resource-level permissions
    // for them (IAM evaluates them against `campaign/*` and denies an
    // `instance/*`-scoped grant), so they must be granted on `*`.
    associationFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'connect-campaigns:StartInstanceOnboardingJob',
          'connect-campaigns:GetInstanceOnboardingJobStatus',
          'connect-campaigns:DeleteInstanceOnboardingJob',
          'connect-campaigns:PutConnectInstanceIntegration',
          'connect-campaigns:DeleteConnectInstanceIntegration',
        ],
        resources: ['*'],
      }),
    );

    // connect-campaigns onboarding + PutConnectInstanceIntegration validate the
    // target Connect instance on the caller's behalf, so the handler role also
    // needs connect:DescribeInstance on the (construct-owned) instance.
    associationFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['connect:DescribeInstance'],
        resources: [connectInstance.attrArn],
      }),
    );

    // Reciprocal Customer Profiles integration on THIS domain only (IAM prefix
    // for Customer Profiles is `profile`). GetDomain is read-only and required
    // because PutConnectInstanceIntegration validates the Customer Profiles
    // domain before wiring the integration.
    const domainArn = Arn.format(
      {
        service: 'profile',
        resource: 'domains',
        resourceName: domainName,
        arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      },
      stack,
    );
    associationFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'profile:PutIntegration',
          'profile:DeleteIntegration',
          'profile:GetDomain',
        ],
        resources: [
          domainArn,
          Arn.format(
            {
              service: 'profile',
              resource: 'domains',
              resourceName: `${domainName}/integrations/*`,
              arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            },
            stack,
          ),
        ],
      }),
    );
    // PutConnectInstanceIntegration validates the four built-in campaign
    // object-type TEMPLATES referenced by objectTypeNames (Campaign-Email,
    // Campaign-SMS, Campaign-Telephony, Campaign-Orchestration) via
    // profile:GetProfileObjectTypeTemplate, using the CALLER's credentials.
    // Templates are account/region-level resources whose ARN carries a leading
    // slash (`:/templates/<name>`), distinct from the domain, so they need their
    // own grant.
    const profileTemplatesArn = `arn:${stack.partition}:profile:${stack.region}:${stack.account}:/templates/*`;
    associationFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'profile:GetProfileObjectTypeTemplate',
          'profile:ListProfileObjectTypeTemplates',
        ],
        resources: [profileTemplatesArn],
      }),
    );
    // Onboarding auto-creates the Outbound Campaigns service-linked role; the
    // handler then lists roles to resolve its ARN. iam:ListRoles has no
    // resource-level scoping, so it must target `*`.
    associationFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['iam:ListRoles'],
        resources: ['*'],
      }),
    );
    // Each StartInstanceOnboardingJob for a NEW Connect instance creates its own
    // connect-campaigns service-linked role (the role name carries a
    // service-generated random suffix), so the grant must use `*` for the
    // resource and is instead scoped safely by the iam:AWSServiceName condition
    // to ONLY the connect-campaigns SLR. A path-scoped resource ARN is denied by
    // IAM here (surfaced as the onboarding job's IAM_ACCESS_DENIED failureCode).
    const campaignsSlrArn = `arn:${stack.partition}:iam::${stack.account}:role/aws-service-role/${CONNECT_CAMPAIGNS_SERVICE_NAME}/*`;
    associationFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['iam:CreateServiceLinkedRole'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'iam:AWSServiceName': CONNECT_CAMPAIGNS_SERVICE_NAME,
          },
        },
      }),
    );
    associationFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [campaignsSlrArn],
      }),
    );
    // During onboarding, connect-campaigns customizes its service-linked role
    // with instance-specific inline permissions (the "additional permissions
    // added for the service-linked role to access the resources", incl. the
    // Customer Profiles integration access) via iam:PutRolePolicy /
    // iam:AttachRolePolicy, performed with the CALLER's credentials. Without
    // these the onboarding job fails with failureCode IAM_ACCESS_DENIED. The
    // reverse (Delete/Detach) mirrors this so the best-effort teardown can
    // remove those inline permissions when disassociating. Scoped to ONLY the
    // connect-campaigns service-linked role.
    associationFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'iam:PutRolePolicy',
          'iam:AttachRolePolicy',
          'iam:DeleteRolePolicy',
          'iam:DetachRolePolicy',
        ],
        resources: [campaignsSlrArn],
      }),
    );
    // Onboarding also provisions a managed EventBridge rule (named
    // `ConnectCampaignsRule*`) that drives campaign event delivery, created with
    // the CALLER's credentials. Without these the onboarding job fails with
    // failureCode EVENT_BRIDGE_ACCESS_DENIED. ListRules has no resource-level
    // scoping; the mutating actions are scoped to the ConnectCampaignsRule* name.
    const connectCampaignsRuleArn = `arn:${stack.partition}:events:${stack.region}:${stack.account}:rule/ConnectCampaignsRule*`;
    associationFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['events:ListRules'],
        resources: ['*'],
      }),
    );
    associationFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'events:PutRule',
          'events:PutTargets',
          'events:DeleteRule',
          'events:RemoveTargets',
          'events:ListTargetsByRule',
          'events:DescribeRule',
        ],
        resources: [connectCampaignsRuleArn],
      }),
    );

    const provider = new Provider(this, 'CampaignAssociationProvider', {
      onEventHandler: associationFn,
    });

    const association = new CustomResource(this, 'CampaignAssociation', {
      serviceToken: provider.serviceToken,
      resourceType: 'Custom::OutboundCampaignsDomainAssociation',
      properties: {
        ConnectInstanceId: connectInstance.attrId,
        DomainName: domainName,
        Account: stack.account,
        Region: stack.region,
      },
    });

    // Provision after — and tear down before — the instance + domain it links.
    association.node.addDependency(connectInstance);
    association.node.addDependency(profilesDomain);
  }

  /**
   * Deterministic, stable, per-app base name for the created Connect instance
   * and Customer Profiles domain (create-from-scratch mode).
   *
   * The name must be STABLE across deploy and delete (so CFN resolves the same
   * resource on teardown) and UNIQUE per app / environment (so two apps in the
   * same account don't collide on the globally-unique Connect alias). It is
   * derived from a short hash of the root stack name (which, in Amplify Gen2,
   * embeds the app namespace + branch) plus this construct's path — both stable
   * inputs.
   *
   * The `amazon-connect-` prefix is REQUIRED, not cosmetic: Amazon Connect's
   * AWS-managed service-linked-role policy (`AmazonConnectServiceLinkedRolePolicy`,
   * statement `AllowCustomerProfilesForConnectDomain`) grants the instance's
   * role `profile:*` ONLY on `arn:aws:profile:*:*:domains/amazon-connect-*`. A
   * domain named otherwise is unreachable by the instance — the Connect console
   * and Journey segment builder then report "does not have permissions to access
   * Customer Profiles". The SLR is AWS-protected (no inline policy can be added)
   * and the managed policy is not editable, so the domain name is the only lever.
   */
  private generateResourceName(): string {
    let root: Stack = this.stack;
    while (root.nestedStackParent) {
      root = root.nestedStackParent;
    }
    const seed = `${root.stackName}::${this.node.path}`;
    const suffix = createHash('sha256').update(seed).digest('hex').slice(0, 12);
    return `amazon-connect-notifications-${suffix}`;
  }

  /**
   * Coerce an arbitrary string into a valid Amazon Connect instance alias:
   * lowercase alphanumeric characters + single hyphens, no leading/trailing hyphen, not
   * starting with the reserved `d-` prefix, and within Connect's 1–62 char
   * bound.
   */
  private sanitizeInstanceAlias(raw: string): string {
    // Collapse consecutive dashes AND strip leading/trailing dashes in one
    // linear, backtracking-free pass. Splitting on the dash and dropping empty
    // segments yields exactly the same result as the former collapse-then-trim
    // regex chain, but without any repeated-quantifier / anchored-alternation
    // regex applied to the uncontrolled `raw` input (ReDoS-safe).
    let alias = raw
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .split('-')
      .filter(Boolean)
      .join('-');
    if (alias.startsWith('d-')) {
      alias = `a${alias}`;
    }
    if (alias.length === 0) {
      alias = 'amplify-notifications';
    }
    // The 62-char cap can slice mid-token and leave a single trailing dash
    // (segments are already single-dash separated). Trim it with a linear
    // character loop rather than an anchored trailing-dash quantifier.
    alias = alias.slice(0, 62);
    while (alias.endsWith('-')) {
      alias = alias.slice(0, -1);
    }
    return alias;
  }
}
