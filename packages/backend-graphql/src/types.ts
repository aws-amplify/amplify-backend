import { DerivedModelSchema } from '@aws-amplify/amplify-api-next-types-alpha';
import { AmplifyFunctionFactory } from '@aws-amplify/backend-function';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { IRole } from 'aws-cdk-lib/aws-iam';

/**
 * Determine which auth mode is specified as 'default' in the Appsync API, only required if more than one authorization mode is specified.
 */
export type DefaultAuthorizationMode =
  | 'AWS_IAM'
  | 'AMAZON_COGNITO_USER_POOLS'
  | 'OPENID_CONNECT'
  | 'API_KEY'
  | 'AWS_LAMBDA';

/**
 * Configuration for Api Keys on the Graphql Api.
 */
export type ApiKeyAuthorizationConfig = {
  /**
   * Optional description for the Api Key to attach to the Api.
   */
  description?: string;

  /**
   * A duration representing the time from Cloudformation deploy until expiry.
   * @default 7
   */
  expiresInDays?: number;
};

/**
 * Configuration for Cognito UserPool Authorization on the Graphql Api.
 */
export type UserPoolAuthorizationConfig = {
  /**
   * The Cognito User Pool which is used to authenticated JWT tokens, and vends group and user information.
   */
  userPool: IUserPool;
};

/**
 * Configuration for IAM Authorization on the Graphql Api.
 */
export type IAMAuthorizationConfig = {
  /**
   * ID for the Cognito Identity Pool vending auth and unauth roles.
   * Format: `<region>:<id string>`
   */
  identityPoolId: string;
  /**
   * Authenticated user role, applies to { provider: iam, allow: private } access.
   */
  authenticatedUserRole: IRole;
  /**
   * Unauthenticated user role, applies to { provider: iam, allow: public } access.
   */
  unauthenticatedUserRole: IRole;
};

/**
 * Configuration for Custom Lambda authorization on the Graphql Api.
 */
export type LambdaAuthorizationConfig = {
  /**
   * The authorization lambda function.
   */
  function: FunctionInput;

  /**
   * How long the results are cached.
   * @default 60
   */
  timeToLiveInSeconds?: number;
};

/**
 * Configuration for OpenId Connect Authorization on the Graphql Api.
 */
export type OIDCAuthorizationConfig = {
  /**
   * The issuer for the OIDC configuration.
   */
  oidcProviderName: string;

  /**
   * Url for the OIDC token issuer.
   */
  oidcIssuerUrl: string;

  /**
   * The client identifier of the Relying party at the OpenID identity provider.
   * A regular expression can be specified so AppSync can validate against multiple client identifiers at a time. Example
   */
  clientId?: string;

  /**
   * The duration an OIDC token is valid after being authenticated by OIDC provider in seconds.
   * auth_time claim in OIDC token is required for this validation to work.
   */
  tokenExpiryFromAuthInSeconds: number;
  /**
   * The duration an OIDC token is valid after being issued to a user in seconds.
   * This validation uses iat claim of OIDC token.
   */
  tokenExpireFromIssueInSeconds: number;
};

/**
 * AppSync Authorization config for the generated API.
 */
export type AuthorizationModes = {
  /**
   * Default auth mode to use in the API, only required if more than one auth mode is specified.
   */
  defaultAuthorizationMode?: DefaultAuthorizationMode;

  /**
   * Override API Key config if apiKey auth provider is specified in api definition.
   */
  apiKeyConfig?: ApiKeyAuthorizationConfig;

  /**
   * Override user pool config if userPool auth provider is specified in api definition.
   */
  userPoolConfig?: UserPoolAuthorizationConfig;

  /**
   * Override iam config if iam auth provider is specified in the api definition.
   */
  iamConfig?: IAMAuthorizationConfig;

  /**
   * Lambda authorization config if function provider is specified in the api definition.
   */
  lambdaConfig?: LambdaAuthorizationConfig;

  /**
   * OIDC authorization config if oidc provider is specified in the api definition.
   */
  oidcConfig?: OIDCAuthorizationConfig;

  /**
   * Admin roles which are provided full r/w access to the API.
   */
  adminRoles?: IRole[];
};

/**
 * Union type representing the possible functions we accept.
 */
export type FunctionInput = IFunction | AmplifyFunctionFactory;

/**
 * Schema type definition, can be either a raw Graphql string, or a typed model schema.
 */
export type DataSchema = string | DerivedModelSchema;

/**
 * Exposed props for Data which are configurable by the end user.
 */
export type DataProps = {
  /**
   * Graphql Schema as a string to be passed into the CDK construct.
   */
  schema: DataSchema;

  /**
   * Optional name for the generated Api.
   */
  name?: string;

  /**
   * Override authorization config, which will apply on top of defaults based on availability of auth, etc.
   */
  authorizationModes?: AuthorizationModes;

  /**
   * Functions invokable by the API.
   */
  functions?: Record<string, FunctionInput>;
};
