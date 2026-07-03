import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { Arn, ArnFormat, CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnDomain, CfnObjectType } from 'aws-cdk-lib/aws-customerprofiles';
import { CfnApp } from 'aws-cdk-lib/aws-pinpoint';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { ResourceProvider, StackProvider } from '@aws-amplify/plugin-types';

import {
  CONNECT_INVOKE_SERVICE_PRINCIPALS,
  DEFAULT_DOMAIN_NAME,
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
  /**
   * The Customer Profiles domain this construct created. Only present in create
   * mode (`createDomain: true`); `undefined` in the default ATTACH mode, where
   * the domain already exists and is not managed by this construct.
   */
  domain?: CfnDomain;
  /** The AmplifyProfile object type registered on the domain. */
  profileObjectType: CfnObjectType;
  /** The AmplifyDevice object type registered on the domain. */
  deviceObjectType: CfnObjectType;
  /**
   * The push-delivery Lambda function. Only present when `push` is enabled;
   * wired as the target of a Connect Journey Custom-action (Invoke Lambda).
   */
  pushFunction?: lambda.IFunction;
  /**
   * The AWS End User Messaging / Pinpoint application backing push delivery.
   * Only present when `push` is enabled AND no external `eumApplicationId` was
   * supplied (i.e. this construct created the app).
   */
  pushApplication?: CfnApp;
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
   * Customer Profiles domain name.
   *
   * In the default ATTACH mode this is the name of an EXISTING Customer
   * Profiles domain (e.g. the domain Amazon Connect auto-creates when Customer
   * Profiles is enabled on an instance) that the AmplifyProfile / AmplifyDevice
   * object types are registered INTO — required, no default. In create mode
   * (`createDomain: true`) this is the name of the domain to provision and
   * defaults to `AmplifyIdentifyUserPoc`.
   */
  readonly domainName?: string;

  /**
   * Provision a NEW Customer Profiles domain (with Identity Resolution
   * auto-merge) instead of attaching to an existing one.
   *
   * Default `false` (ATTACH mode): the construct does NOT create an
   * `AWS::CustomerProfiles::Domain`. It registers the AmplifyProfile /
   * AmplifyDevice object types into the existing domain named by `domainName`
   * (additive — other object types such as Connect's CTR / Outbound Campaigns
   * types are left untouched) and points the Lambdas at that domain. Use this
   * against a Connect-managed domain, where the instance owns the domain 1:1
   * and a second domain cannot be created.
   *
   * Set `true` for a greenfield deployment where this construct owns the domain
   * lifecycle. Identity Resolution auto-merge is only configured in this mode.
   */
  readonly createDomain?: boolean;

  /**
   * Override the directory containing the pre-bundled Lambda asset (an
   * `index.js` exporting `handler`). Defaults to the handler bundled inside this
   * package (`lib/handler-asset`, produced by `post:compile`).
   */
  readonly lambdaCodePath?: string;

  /** Profile / object-type expiration in days. Default: 366. */
  readonly expirationDays?: number;

  /**
   * Enable the push-delivery path: a Lambda that Amazon Connect invokes (via a
   * Journey Custom-action) to deliver mobile push through AWS End User
   * Messaging. Connect has no native push channel, so this Lambda bridges the
   * gap. Default: `false` (the identify path is unaffected).
   */
  readonly push?: boolean;

  /**
   * Reuse an existing AWS End User Messaging / Pinpoint application (project)
   * id for `SendMessages` instead of creating one. When omitted (and `push` is
   * enabled) the construct provisions a minimal Pinpoint app for the PoC.
   */
  readonly eumApplicationId?: string;

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
 *
 * By default the construct runs in ATTACH mode: it registers the two object
 * types INTO an EXISTING Customer Profiles domain (named by `domainName`) —
 * such as the domain Amazon Connect auto-creates and binds 1:1 when Customer
 * Profiles is enabled on an instance — without creating an
 * `AWS::CustomerProfiles::Domain` and without touching the domain's other
 * integrations (CTR, Outbound Campaigns) or its Identity Resolution setting.
 *
 * Set `createDomain: true` for a greenfield deployment where this construct
 * owns the domain: it then also provisions the domain with Identity Resolution
 * auto-merge (async backstop consolidating on the `cognitoUserKey` custom
 * attribute).
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
   * `true` when this construct provisioned the Customer Profiles domain
   * (`createDomain: true`); `false` in the default ATTACH mode, where the
   * domain already existed and is left under external ownership.
   */
  public readonly createdDomain: boolean;
  /**
   * ARN of the push-delivery Lambda (to wire as a Connect Journey
   * Custom-action target). `undefined` unless `push` is enabled.
   */
  public readonly pushFunctionArn?: string;
  /**
   * The AWS End User Messaging / Pinpoint application id used for push
   * `SendMessages` — either the supplied `eumApplicationId` or the id of the
   * app this construct created. `undefined` unless `push` is enabled.
   */
  public readonly eumApplicationId?: string;

  /**
   * Registers the AmplifyProfile / AmplifyDevice object types (attaching to an
   * existing Customer Profiles domain by default, or provisioning one when
   * `createDomain` is set), the identify-user Lambda, and the JWT-authorized
   * HTTP API for this notifications backend.
   */
  constructor(scope: Construct, id: string, props: AmplifyNotificationsProps) {
    super(scope, id);

    const stack = Stack.of(this);
    this.stack = stack;
    const createDomain = props.createDomain ?? false;
    const domainName =
      props.domainName ?? (createDomain ? DEFAULT_DOMAIN_NAME : undefined);
    if (!domainName) {
      throw new Error(
        'AmplifyNotifications: `domainName` is required in the default attach ' +
          'mode — provide the name of the existing Customer Profiles domain to ' +
          'register the object types into (e.g. the domain Amazon Connect ' +
          'created for your instance). To provision a new domain instead, set ' +
          '`createDomain: true`.',
      );
    }
    const expirationDays = props.expirationDays ?? DEFAULT_EXPIRATION_DAYS;
    this.domainName = domainName;
    this.createdDomain = createDomain;

    // ---- Customer Profiles domain -----------------------------------------
    // ATTACH mode (default): do NOT create a domain — the object types below
    // register into the existing `domainName` (additive). CREATE mode: own the
    // domain and enable Identity Resolution auto-merge.
    let domain: CfnDomain | undefined;
    if (createDomain) {
      domain = new CfnDomain(this, 'ProfilesDomain', {
        domainName,
        defaultExpirationDays: expirationDays,
        matching: {
          enabled: true,
          autoMerging: {
            enabled: true,
            conflictResolution: { conflictResolvingModel: 'RECENCY' },
            consolidation: {
              matchingAttributesList: [['Attributes.cognitoUserKey']],
            },
          },
          jobSchedule: { dayOfTheWeek: 'SUNDAY', time: '08:00' },
        },
      });
    }

    // ---- Object types ------------------------------------------------------
    // Registered by name into `domainName` regardless of mode. In attach mode
    // there is no CfnDomain to depend on — the object types reference the
    // existing domain and are purely additive (Connect's CTR / Campaign object
    // types on the same domain are untouched).
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
    if (domain) {
      profileType.addDependency(domain);
    }

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
    if (domain) {
      deviceType.addDependency(domain);
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

    // ---- Push-delivery path (optional) ------------------------------------
    // Amazon Connect has no native mobile-push channel. When enabled, provision
    // a Lambda that Connect invokes via a Journey Custom-action to deliver push
    // through AWS End User Messaging (Pinpoint SendMessages).
    let pushFunction: lambda.IFunction | undefined;
    let pushApplication: CfnApp | undefined;
    if (props.push) {
      // Reuse a supplied EUM app, or create a minimal Pinpoint app for the PoC
      // so SendMessages has a valid ApplicationId.
      let eumApplicationId: string;
      if (props.eumApplicationId) {
        eumApplicationId = props.eumApplicationId;
      } else {
        pushApplication = new CfnApp(this, 'PushApp', {
          name: `${domainName}-push`,
        });
        eumApplicationId = pushApplication.ref;
      }
      this.eumApplicationId = eumApplicationId;

      const pushCodePath =
        props.pushLambdaCodePath ?? defaultPushLambdaCodePath;
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

      // ---- Runtime message-template resolution (Q in Connect) -------------
      // The push Lambda resolves per-profile copy from a Q in Connect (Wisdom)
      // PUSH message template at runtime: it discovers the knowledge base from
      // the journey's campaign (DescribeCampaign -> connectInstanceId ->
      // ListIntegrationAssociations) and renders the template whose name matches
      // the Custom-action ActionId. Least-privilege, scoped to this account /
      // region. IAM prefixes confirmed empirically: campaign actions use
      // `connect-campaigns`, integration listing uses `connect`, and Q in
      // Connect message-template actions use the `wisdom` prefix (Q in Connect
      // is the rebrand of Amazon Connect Wisdom; the SDK client is
      // `@aws-sdk/client-qconnect` but IAM/ARNs remain `wisdom`).
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
            'wisdom:SearchMessageTemplates',
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

      // ---- Invoke resource policy for Amazon Connect ----------------------
      // A Connect Journey Custom-action (and Outbound Campaigns v2) invokes
      // this Lambda through the connect / connect-campaigns service principal.
      // Grant lambda:InvokeFunction to both, scoped to THIS account
      // (`sourceAccount`) so only Connect instances in the deploying account —
      // not any Connect instance anywhere — can invoke it (confused-deputy
      // guard). The Connect instance ARN isn't known at synth time, so account
      // scoping is the tightest guard available here.
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

      pushFunction = pushFn;
      this.pushFunctionArn = pushFn.functionArn;

      // Scoped to the stack (not `this`) so the output keeps a stable,
      // readable logical id (`PushHandlerFunctionArn`) that a human can find in
      // the CloudFormation console and copy to wire the Journey Custom-action.
      new CfnOutput(stack, 'PushHandlerFunctionArn', {
        value: pushFn.functionArn,
        description:
          'Wire as a Connect Journey Custom-action (Invoke Lambda) target',
      });
    }

    this.resources = {
      identifyUserFunction: fn,
      httpApi,
      domain,
      profileObjectType: profileType,
      deviceObjectType: deviceType,
      pushFunction,
      pushApplication,
    };
  }
}
