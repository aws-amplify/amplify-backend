import {
  DerivedCombinedSchema,
  DerivedModelSchema,
} from '@aws-amplify/data-schema-types';
import {
  AmplifyFunction,
  ConstructFactory,
  LogLevel,
  LogRetention,
} from '@aws-amplify/plugin-types';

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

  /**
   * Logging configuration for the API.
   */
  logging?: DataLoggingOptions;

  /**
   * Mapping of model name to existing DynamoDB table that should be used as the data source.
   * Each element in the array represents a mapping for a specific branch.
   */
  migratedAmplifyGen1DynamoDbTableMappings?: AmplifyGen1DynamoDbTableMapping[];
};

export type AmplifyDataError =
  | 'DefineDataConfigurationError'
  | 'InvalidSchemaAuthError'
  | 'InvalidSchemaError'
  | 'MultipleSingletonResourcesError'
  | 'UnresolvedEntryPathError';

/**
 * The logging configuration when writing GraphQL operations and tracing to Amazon CloudWatch for an AWS AppSync GraphQL API.
 * Values can be `true` or a `DataLogConfig` object.
 *
 * ### Defaults
 * Default settings will be applied when logging is set to `true` or an empty object, or for unspecified fields:
 * - `excludeVerboseContent`: `true`
 * - `fieldLogLevel`: `none`
 * - `retention`: `1 week`
 *
 * **WARNING**: Verbose logging will log the full incoming query including user parameters.
 * Sensitive information may be exposed in CloudWatch logs. Ensure that your IAM policies only grant access to authorized users.
 *
 * For information on AppSync's LogConfig, refer to https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-appsync-graphqlapi-logconfig.html.
 */
export type DataLoggingOptions = true | DataLogConfig;

/**
 * Customizable logging configuration when writing GraphQL operations and tracing to Amazon CloudWatch for an AWS AppSync GraphQL API.
 *
 * **WARNING**: Verbose logging will log the full incoming query including user parameters.
 * Sensitive information may be exposed in CloudWatch logs. Ensure that your IAM policies only grant access to authorized users.
 *
 * For information on AppSync's LogConfig, refer to https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-appsync-graphqlapi-logconfig.html.
 * For information on RetentionDays, refer to https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.RetentionDays.html.
 * @default excludeVerboseContent: true, fieldLogLevel: 'none', retention: '1 week'
 */
export type DataLogConfig = {
  /**
   * The number of days log events are kept in CloudWatch Logs.
   * @default RetentionDays.ONE_WEEK
   * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.RetentionDays.html
   */
  retention?: LogRetention;

  /**
   * When set to `true`, excludes verbose information from the logs, such as:
   * - GraphQL Query
   * - Request Headers
   * - Response Headers
   * - Context
   * - Evaluated Mapping Templates
   *
   * This setting applies regardless of the specified logging level.
   *
   * **WARNING**: Verbose logging will log the full incoming query including user parameters.
   * Sensitive information may be exposed in CloudWatch logs. Ensure that your IAM policies only grant access to authorized users.
   * @default true
   */
  excludeVerboseContent?: boolean;

  /**
   * The field logging level. Values can be `'none'`, `'error'`, `'info'`, `'debug'`, or `'all'`.
   *
   * - **'none'**: No field-level logs are captured.
   * - **'error'**: Logs the following information only for the fields that are in the error category:
   *   - The error section in the server response.
   *   - Field-level errors.
   *   - The generated request/response functions that got resolved for error fields.
   * - **'info'**: Logs the following information only for the fields that are in the info and error categories:
   *   - Info-level messages.
   *   - The user messages sent through `$util.log.info` and `console.log`.
   *   - Field-level tracing and mapping logs are not shown.
   * - **'debug'**: Logs the following information only for the fields that are in the debug, info, and error categories:
   *   - Debug-level messages.
   *   - The user messages sent through `$util.log.info`, `$util.log.debug`, `console.log`, and `console.debug`.
   *   - Field-level tracing and mapping logs are not shown.
   * - **'all'**: The following information is logged for all fields in the query:
   *   - Field-level tracing information.
   *   - The generated request/response functions that were resolved for each field.
   * @default 'none'
   */
  fieldLogLevel?: DataLogLevel;
};

export type DataLogLevel = Extract<
  LogLevel,
  'none' | 'all' | 'info' | 'debug' | 'error'
>;

/**
 * Mapping of model name to existing DynamoDB table that should be used as the data source.
 * The mapping will only apply to the branch specified.
 * If the mapping is undefined or empty, no tables will be imported for that branch.
 */
export type AmplifyGen1DynamoDbTableMapping = {
  branchName: string;
  modelTableNameMap?: ModelTableNameMap;
};

/**
 * Mapping of model name to dynamodb table name.
 */
export type ModelTableNameMap = Record<string, string>;
