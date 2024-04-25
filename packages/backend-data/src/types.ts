import {
  DerivedCombinedSchema,
  DerivedModelSchema,
} from '@aws-amplify/data-schema-types';
import { AmplifyFunction, ConstructFactory } from '@aws-amplify/plugin-types';

/**
 * Authorization modes used in by client side Amplify represented in camelCase.
 */
export type DefaultAuthorizationMode =
  | 'iam'
  | 'identityPool'
  | 'userPool'
  | 'oidc'
  | 'apiKey'
  | 'lambda';

/**
 * Props for Api Keys on the Graphql Api.
 */
export type ApiKeyAuthorizationModeProps = {
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
 * Props for Custom Lambda authorization on the Graphql Api.
 */
export type LambdaAuthorizationModeProps = {
  /**
   * The authorization lambda function. The specific input type of the function is subject to change or removal.
   */
  function: ConstructFactory<AmplifyFunction>;

  /**
   * How long the results are cached.
   * @default 60
   */
  timeToLiveInSeconds?: number;
};

/**
 * Props for OpenId Connect Authorization on the Graphql Api.
 */
export type OIDCAuthorizationModeProps = {
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
  apiKeyAuthorizationMode?: ApiKeyAuthorizationModeProps;

  /**
   * Lambda authorization config if function provider is specified in the api definition.
   */
  lambdaAuthorizationMode?: LambdaAuthorizationModeProps;

  /**
   * OIDC authorization config if oidc provider is specified in the api definition.
   */
  oidcAuthorizationMode?: OIDCAuthorizationModeProps;
};

/**
 * Schemas type definition, can be either a raw Graphql string, or a typed model schema, or a collection of combined Schemas.
 */
export type DataSchemaInput =
  | string
  | DerivedModelSchema
  | DerivedCombinedSchema;

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
  schema: DataSchemaInput;

  /**
   * Optional name for the generated Api.
   */
  name?: string;

  /**
   * Override authorization config, which will apply on top of defaults based on availability of auth, etc.
   */
  authorizationModes?: AuthorizationModes;

  /**
   * Functions invokable by the API. The specific input type of the function is subject to change or removal.
   */
  functions?: Record<string, ConstructFactory<AmplifyFunction>>;
};

export type AmplifyDataError =
  | 'DefineDataConfigurationError'
  | 'InvalidSchemaAuthError'
  | 'InvalidSchemaError'
  | 'MultipleSingletonResourcesError'
  | 'UnresolvedEntryPath';
