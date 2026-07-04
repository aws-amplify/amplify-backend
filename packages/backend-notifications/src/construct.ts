import * as path from 'path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Arn, ArnFormat, CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnDomain, CfnObjectType } from 'aws-cdk-lib/aws-customerprofiles';
import { CfnInstance } from 'aws-cdk-lib/aws-connect';
import { CfnApp } from 'aws-cdk-lib/aws-pinpoint';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { ResourceProvider, StackProvider } from '@aws-amplify/plugin-types';

import {
  CONNECT_INVOKE_SERVICE_PRINCIPALS,
  DEFAULT_EXPIRATION_DAYS,
  ENV_DOMAIN_NAME,
  ENV_EUM_APPLICATION_ID,
} from './constants.js';
import {
  AMPLIFY_DEVICE_FIELDS,
  AMPLIFY_DEVICE_KEYS,
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

/** CDK resources exposed by {@link AmplifyNotifications}. */
export type NotificationsResources = {
  /** The identify-user Lambda function. */
  identifyUserFunction: lambda.IFunction;
  /** The HTTP API fronting the identify-user route. */
  httpApi: apigwv2.HttpApi;
  /** The AmplifyProfile object type registered on the domain. */
  profileObjectType: CfnObjectType;
  /** The AmplifyDevice object type registered on the domain. */
  deviceObjectType: CfnObjectType;
  /**
   * The push-delivery Lambda function, wired as the target of a Connect Journey
   * Custom-action (Invoke Lambda).
   */
  pushFunction: lambda.IFunction;
  /** The AWS End User Messaging / Pinpoint application backing push delivery. */
  pushApplication: CfnApp;
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
   * Override the directory containing the pre-bundled push Lambda asset (an
   * `index.js` exporting `handler`). Defaults to the handler bundled inside this
   * package (`lib/push-handler-asset`, produced by `post:compile`).
   */
  readonly pushLambdaCodePath?: string;
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
 * In either mode, associating the (new or existing) domain with an instance's
 * Outbound Campaigns so journeys can target these profiles is a separate,
 * deliberate step performed outside this construct (see the package README /
 * design doc): identify works against the domain standalone regardless.
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

    // ---- Mode selection: create-from-scratch (default) vs attach -----------
    // If a `domainName` is supplied, ATTACH the object types to that existing
    // domain (create nothing). Otherwise (the zero-config default) CREATE a
    // brand-new Connect instance + Customer Profiles domain with generated,
    // stable names and register the object types into the new domain.
    const createFromScratch = !props.domainName;
    this.createsResources = createFromScratch;

    let domainName: string;
    let profilesDomain: CfnDomain | undefined;
    let connectInstance: CfnInstance | undefined;

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
        attributes: {
          inboundCalls: true,
          outboundCalls: true,
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

    const deviceType = new CfnObjectType(this, 'AmplifyDeviceType', {
      domainName,
      objectTypeName: OBJECT_TYPE_NAMES.device,
      description:
        'Amplify identifyUser device (unique per stable deviceId; token is a mutable field; resolves to profile by cognitoUserKey)',
      allowProfileCreation: true,
      fields: AMPLIFY_DEVICE_FIELDS,
      keys: AMPLIFY_DEVICE_KEYS,
      expirationDays,
    });

    if (profilesDomain) {
      profileType.addDependency(profilesDomain);
      deviceType.addDependency(profilesDomain);
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
          // PutProfileObject find-or-create (AmplifyProfile) + read-back.
          'profile:PutProfileObject',
          'profile:SearchProfiles',
          // Read back the existing device object to preserve immutable createdAt.
          'profile:ListProfileObjects',
          // Set targeting / person attributes on the resolved profile.
          'profile:UpdateProfile',
        ],
        resources: [domainArn, objectTypesArn],
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

    // ---- Push-delivery path -----------------------------------------------
    // Amazon Connect has no native mobile-push channel, so a Lambda bridges the
    // gap: Connect invokes it via a Journey Custom-action to deliver push
    // through AWS End User Messaging (Pinpoint SendMessages). A minimal Pinpoint
    // application is always created so SendMessages has a valid ApplicationId;
    // the customer enables the APNS / GCM channels on it with their own platform
    // credentials (console / CLI) — see the package README.
    const pushApplication = new CfnApp(this, 'PushApp', {
      name: `${domainName}-push`,
    });
    const eumApplicationId = pushApplication.ref;
    this.eumApplicationId = eumApplicationId;

    const pushCodePath = props.pushLambdaCodePath ?? defaultPushLambdaCodePath;
    const pushFn = new lambda.Function(this, 'PushHandlerFn', {
      code: lambda.Code.fromAsset(pushCodePath),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        [ENV_DOMAIN_NAME]: domainName,
        [ENV_EUM_APPLICATION_ID]: eumApplicationId,
      },
    });

    // Least-privilege: read + delete device objects on THIS domain only, and
    // SendMessages scoped to THIS EUM application.
    pushFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          // Resolve a profile's registered devices (tokens + channels).
          'profile:ListProfileObjects',
          // Stale-token cleanup: delete a device whose token is dead.
          'profile:DeleteProfileObject',
        ],
        resources: [domainArn, objectTypesArn],
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
    pushFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['connect:ListIntegrationAssociations'],
        resources: [
          Arn.format(
            {
              service: 'connect',
              resource: 'instance',
              resourceName: '*',
              arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            },
            stack,
          ),
        ],
      }),
    );
    pushFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'wisdom:ListMessageTemplates',
          'wisdom:GetMessageTemplate',
          'wisdom:RenderMessageTemplate',
        ],
        resources: [
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
        ],
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
    // can find the new instance / domain in the console and (as a documented
    // follow-up) associate the domain with the instance's Outbound Campaigns.
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
      deviceObjectType: deviceType,
      pushFunction: pushFn,
      pushApplication,
      connectInstance,
      profilesDomain,
    };
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
   * inputs. The `amplify-notifications-` prefix keeps it human-recognisable,
   * lowercase, and clear of the reserved `d-` Connect-alias prefix.
   */
  private generateResourceName(): string {
    let root: Stack = this.stack;
    while (root.nestedStackParent) {
      root = root.nestedStackParent;
    }
    const seed = `${root.stackName}::${this.node.path}`;
    const suffix = createHash('sha256').update(seed).digest('hex').slice(0, 12);
    return `amplify-notifications-${suffix}`;
  }

  /**
   * Coerce an arbitrary string into a valid Amazon Connect instance alias:
   * lowercase alphanumeric characters + single hyphens, no leading/trailing hyphen, not
   * starting with the reserved `d-` prefix, and within Connect's 1–62 char
   * bound.
   */
  private sanitizeInstanceAlias(raw: string): string {
    let alias = raw
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (alias.startsWith('d-')) {
      alias = `a${alias}`;
    }
    if (alias.length === 0) {
      alias = 'amplify-notifications';
    }
    return alias.slice(0, 62).replace(/-+$/g, '');
  }
}
