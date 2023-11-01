import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { IRole, Role } from 'aws-cdk-lib/aws-iam';
import {
  ApiKeyAuthorizationConfig as CDKApiKeyAuthorizationConfig,
  AuthorizationModes as CDKAuthorizationModes,
  IAMAuthorizationConfig as CDKIAMAuthorizationConfig,
  LambdaAuthorizationConfig as CDKLambdaAuthorizationConfig,
  OIDCAuthorizationConfig as CDKOIDCAuthorizationConfig,
  UserPoolAuthorizationConfig as CDKUserPoolAuthorizationConfig,
} from '@aws-amplify/graphql-api-construct';
import {
  ApiKeyAuthorizationConfig,
  AuthorizationModes,
  DefaultAuthorizationMode,
  LambdaAuthorizationConfig,
  OIDCAuthorizationConfig,
} from './types.js';
import { FunctionInstanceProvider } from './convert_functions.js';

export type ProvidedAuthResources = {
  userPool?: IUserPool;
  authenticatedUserRole?: IRole;
  unauthenticatedUserRole?: IRole;
  identityPoolId?: string;
};

const DEFAULT_API_KEY_EXPIRATION_DAYS = 7;
const DEFAULT_LAMBDA_AUTH_TIME_TO_LIVE_SECONDS = 60;

/**
 * Convert to CDK ApiKeyAuthorizationConfig.
 */
const convertApiKeyAuthConfigToCDK = ({
  description,
  expiresInDays = DEFAULT_API_KEY_EXPIRATION_DAYS,
}: ApiKeyAuthorizationConfig): CDKApiKeyAuthorizationConfig => ({
  description,
  expires: Duration.days(expiresInDays),
});

/**
 * Convert to CDK LambdaAuthorizationConfig.
 */
const convertLambdaAuthorizationConfigToCDK = (
  functionInstanceProvider: FunctionInstanceProvider,
  { function: authFn, timeToLiveInSeconds = DEFAULT_LAMBDA_AUTH_TIME_TO_LIVE_SECONDS }: LambdaAuthorizationConfig
): CDKLambdaAuthorizationConfig => ({
  function: functionInstanceProvider.provide(authFn),
  ttl: Duration.seconds(timeToLiveInSeconds),
});

/**
 * Convert to CDK OIDCAuthorizationConfig.
 */
const convertOIDCAuthConfigToCDK = ({
  oidcProviderName,
  oidcIssuerUrl,
  clientId,
  tokenExpiryFromAuthInSeconds,
  tokenExpireFromIssueInSeconds,
}: OIDCAuthorizationConfig): CDKOIDCAuthorizationConfig => ({
  oidcProviderName,
  oidcIssuerUrl,
  clientId,
  tokenExpiryFromAuth: Duration.seconds(tokenExpiryFromAuthInSeconds),
  tokenExpiryFromIssue: Duration.seconds(tokenExpireFromIssueInSeconds),
});

/**
 * Compute default auth mode based on availability of auth resources.
 * Will specify userPool if both user pool is specified, and no auth resources are specified, else rely on override value if needed.
 */
const computeDefaultAuthorizationMode = (
  { userPool }: ProvidedAuthResources,
  authModes: AuthorizationModes | undefined
): DefaultAuthorizationMode | undefined => {
  if (userPool && !authModes) return 'AMAZON_COGNITO_USER_POOLS';
  return;
};

/**
 * Compute user pool auth config from auth resource provider.
 * @returns a user pool auth config, if relevant
 */
const computeUserPoolAuthFromResource = ({
  userPool,
}: ProvidedAuthResources): CDKUserPoolAuthorizationConfig | undefined => {
  if (userPool) {
    return { userPool };
  }
  return;
};

/**
 * Compute iam auth config from auth resource provider.
 * @returns an iam auth config, if relevant
 */
const computeIAMAuthFromResource = ({
  authenticatedUserRole,
  unauthenticatedUserRole,
  identityPoolId,
}: ProvidedAuthResources): CDKIAMAuthorizationConfig | undefined => {
  if (authenticatedUserRole && unauthenticatedUserRole && identityPoolId) {
    return {
      authenticatedUserRole,
      unauthenticatedUserRole,
      identityPoolId,
    };
  }
  return;
};

/**
 * Compute api key auth config from auth resource provider.
 * @returns an api key auth config, if relevant
 */
const computeApiKeyAuthFromResource = (
  {
    userPool,
    authenticatedUserRole,
    unauthenticatedUserRole,
    identityPoolId,
  }: ProvidedAuthResources,
  authModes: AuthorizationModes | undefined
): CDKApiKeyAuthorizationConfig | undefined => {
  if (
    userPool ||
    authenticatedUserRole ||
    unauthenticatedUserRole ||
    identityPoolId ||
    authModes
  ) {
    return;
  }
  return {
    expires: Duration.days(DEFAULT_API_KEY_EXPIRATION_DAYS),
  };
};

const validateAdminRolesHaveIAMAuthorizationConfig = (
  adminRoles: IRole[] | undefined,
  iamConfig: CDKIAMAuthorizationConfig | undefined
): void => {
  if (adminRoles && adminRoles.length > 0 && !iamConfig) {
    throw new Error(
      'Specifying adminRoleNames requires presence of IAM Authorization config. Either add Auth to the project, or specify an iamConfig in the authorizationModes.'
    );
  }
};

/**
 * Convert to CDK AuthorizationModes.
 */
export const convertAuthorizationModesToCDK = (
  scope: Construct,
  functionInstanceProvider: FunctionInstanceProvider,
  authResources: ProvidedAuthResources,
  authModes: AuthorizationModes | undefined
): CDKAuthorizationModes => {
  const defaultAuthorizationMode =
    authModes?.defaultAuthorizationMode ??
    computeDefaultAuthorizationMode(authResources, authModes);
  const apiKeyConfig = authModes?.apiKeyConfig
    ? convertApiKeyAuthConfigToCDK(authModes.apiKeyConfig)
    : computeApiKeyAuthFromResource(authResources, authModes);
  const userPoolConfig =
    authModes?.userPoolConfig ?? computeUserPoolAuthFromResource(authResources);
  const iamConfig =
    authModes?.iamConfig ?? computeIAMAuthFromResource(authResources);
  const lambdaConfig = authModes?.lambdaConfig
    ? convertLambdaAuthorizationConfigToCDK(
        functionInstanceProvider,
        authModes.lambdaConfig
      )
    : undefined;
  const oidcConfig = authModes?.oidcConfig
    ? convertOIDCAuthConfigToCDK(authModes.oidcConfig)
    : undefined;
  const adminRoles = authModes?.adminRoleNames
    ? authModes.adminRoleNames.map((roleName) =>
        Role.fromRoleName(scope, `AdminRole${roleName}`, roleName)
      )
    : undefined;

  validateAdminRolesHaveIAMAuthorizationConfig(adminRoles, iamConfig);

  return {
    ...(defaultAuthorizationMode ? { defaultAuthorizationMode } : undefined),
    ...(apiKeyConfig ? { apiKeyConfig } : undefined),
    ...(userPoolConfig ? { userPoolConfig } : undefined),
    ...(iamConfig ? { iamConfig } : undefined),
    ...(lambdaConfig ? { lambdaConfig } : undefined),
    ...(oidcConfig ? { oidcConfig } : undefined),
    ...(adminRoles ? { adminRoles } : undefined),
  };
};

/**
 * Return whether or not the api will use default API_KEY auth due to absence of auth resources and input auth-modes.
 * @param authResources the generated auth resources in the system
 * @param authModes the provided auth modes
 * @returns a boolean indicating whether or not default api key auth will be used.
 */
export const isUsingDefaultApiKeyAuth = (
  authResources: ProvidedAuthResources,
  authModes: AuthorizationModes | undefined
): boolean => {
  return (
    authModes === undefined &&
    computeApiKeyAuthFromResource(authResources, authModes) !== undefined
  );
};
