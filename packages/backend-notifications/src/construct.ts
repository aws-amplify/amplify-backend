import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { Arn, ArnFormat, CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnDomain, CfnObjectType } from 'aws-cdk-lib/aws-customerprofiles';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { ResourceProvider, StackProvider } from '@aws-amplify/plugin-types';

import {
  DEFAULT_DOMAIN_NAME,
  DEFAULT_EXPIRATION_DAYS,
  ENV_DOMAIN_NAME,
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

/** CDK resources exposed by {@link AmplifyNotifications}. */
export type NotificationsResources = {
  /** The identify-user Lambda function. */
  identifyUserFunction: lambda.IFunction;
  /** The HTTP API fronting the identify-user route. */
  httpApi: apigwv2.HttpApi;
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

  /** Customer Profiles domain name to create. Default: `AmplifyIdentifyUserPoc`. */
  readonly domainName?: string;

  /**
   * Override the directory containing the pre-bundled Lambda asset (an
   * `index.js` exporting `handler`). Defaults to the handler bundled inside this
   * package (`lib/handler-asset`, produced by `post:compile`).
   */
  readonly lambdaCodePath?: string;

  /** Profile / object-type expiration in days. Default: 366. */
  readonly expirationDays?: number;
};

/**
 * Amazon Connect Customer Profiles backend for the identifyUser contract,
 * packaged as an AWS CDK construct. Provisions:
 *   - Customer Profiles Domain with Identity Resolution auto-merge (async
 *     backstop consolidating on the `cognitoUserKey` custom attribute).
 *   - AmplifyProfile object type: searchable `cognitoUserKey` (PROFILE + UNIQUE)
 *     identity key + person / targeting attribute schema.
 *   - AmplifyDevice object type: PROFILE-resolution key = `cognitoUserKey`,
 *     UNIQUE object key = stable `deviceId`; device fields stored raw.
 *   - identify-user Lambda with least-privilege profile:* on this domain only.
 *   - HTTP API + JWT authorizer bound to the supplied issuer / audience.
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
  /** The Customer Profiles domain name that was created. */
  public readonly domainName: string;

  /**
   * Creates the Customer Profiles domain, object types, identify-user Lambda,
   * and JWT-authorized HTTP API for this notifications backend.
   */
  constructor(scope: Construct, id: string, props: AmplifyNotificationsProps) {
    super(scope, id);

    const stack = Stack.of(this);
    this.stack = stack;
    const domainName = props.domainName ?? DEFAULT_DOMAIN_NAME;
    const expirationDays = props.expirationDays ?? DEFAULT_EXPIRATION_DAYS;
    this.domainName = domainName;

    // ---- Customer Profiles domain (+ Identity Resolution auto-merge) -------
    const domain = new CfnDomain(this, 'ProfilesDomain', {
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

    // ---- Object types ------------------------------------------------------
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
    profileType.addDependency(domain);

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
    deviceType.addDependency(domain);

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
    this.resources = { identifyUserFunction: fn, httpApi };

    new CfnOutput(stack, 'IdentifyUserApiEndpoint', {
      value: httpApi.apiEndpoint,
      description: 'POST {value}/identify-user',
    });
  }
}
