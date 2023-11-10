import { Duration } from 'aws-cdk-lib';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { IRole } from 'aws-cdk-lib/aws-iam';
import {
  ApiKeyAuthorizationConfig as CDKApiKeyAuthorizationConfig,
  AuthorizationModes as CDKAuthorizationModes,
  IAMAuthorizationConfig as CDKIAMAuthorizationConfig,
  LambdaAuthorizationConfig as CDKLambdaAuthorizationConfig,
  OIDCAuthorizationConfig as CDKOIDCAuthorizationConfig,
  UserPoolAuthorizationConfig as CDKUserPoolAuthorizationConfig,
} from '@aws-amplify/graphql-api-construct';
import {
  ApiKeyAuthorizationModeProps,
  AuthorizationModes,
  DefaultAuthorizationMode,
  LambdaAuthorizationModeProps,
  OIDCAuthorizationModeProps,
} from './types.js';
import { FunctionInstanceProvider } from './convert_functions.js';
import { AuthResources, ResourceProvider } from '@aws-amplify/plugin-types';

const DEFAULT_API_KEY_EXPIRATION_DAYS = 7;
const DEFAULT_LAMBDA_AUTH_TIME_TO_LIVE_SECONDS = 60;

export type ProvidedAuthConfig = {
  userPool: IUserPool;
  authenticatedUserRole: IRole;
  unauthenticatedUserRole: IRole;
  identityPoolId: string;
};

/**
 * Function instance provider which uses the
 */
export const buildConstructFactoryProvidedAuthConfig = (
  authResourceProvider: ResourceProvider<AuthResources> | undefined
): ProvidedAuthConfig | undefined => {
  if (!authResourceProvider) return;

  return {
    userPool: authResourceProvider.resources.userPool,
    identityPoolId:
      authResourceProvider.resources.cfnResources.cfnIdentityPool.logicalId,
    authenticatedUserRole:
      authResourceProvider.resources.authenticatedUserIamRole,
    unauthenticatedUserRole:
      authResourceProvider.resources.unauthenticatedUserIamRole,
  };
};

/**
 * Convert to CDK ApiKeyAuthorizationConfig.
 */
const convertApiKeyAuthConfigToCDK = ({
  description,
  expiresInDays = DEFAULT_API_KEY_EXPIRATION_DAYS,
}: ApiKeyAuthorizationModeProps): CDKApiKeyAuthorizationConfig => ({
  description,
  expires: Duration.days(expiresInDays),
});

/**
 * Convert to CDK LambdaAuthorizationConfig.
 */
const convertLambdaAuthorizationConfigToCDK = (
  functionInstanceProvider: FunctionInstanceProvider,
  {
    function: authFn,
    timeToLiveInSeconds = DEFAULT_LAMBDA_AUTH_TIME_TO_LIVE_SECONDS,
  }: LambdaAuthorizationModeProps
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
}: OIDCAuthorizationModeProps): CDKOIDCAuthorizationConfig => ({
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
  providedAuthConfig: ProvidedAuthConfig | undefined,
  authModes: AuthorizationModes | undefined
): DefaultAuthorizationMode | undefined => {
  if (providedAuthConfig && !authModes) return 'AMAZON_COGNITO_USER_POOLS';
  return;
};

/**
 * Compute user pool auth config from auth resource provider.
 * @returns a user pool auth config, if relevant
 */
const computeUserPoolAuthFromResource = (
  providedAuthConfig: ProvidedAuthConfig | undefined
): CDKUserPoolAuthorizationConfig | undefined => {
  if (providedAuthConfig) {
    return { userPool: providedAuthConfig.userPool };
  }
  return;
};

/**
 * Compute iam auth config from auth resource provider.
 * @returns an iam auth config, if relevant
 */
const computeIAMAuthFromResource = (
  providedAuthConfig: ProvidedAuthConfig | undefined,
  authModes: AuthorizationModes | undefined
): CDKIAMAuthorizationConfig | undefined => {
  if (providedAuthConfig) {
    return {
      authenticatedUserRole: providedAuthConfig.authenticatedUserRole,
      unauthenticatedUserRole: providedAuthConfig.unauthenticatedUserRole,
      identityPoolId: providedAuthConfig.identityPoolId,
      allowListedRoles: authModes?.allowListedRoleNames ?? [],
    };
  }
  return;
};

/**
 * Compute api key auth config from auth resource provider.
 * @returns an api key auth config, if relevant
 */
const computeApiKeyAuthFromResource = (
  providedAuthConfig: ProvidedAuthConfig | undefined,
  authModes: AuthorizationModes | undefined
): CDKApiKeyAuthorizationConfig | undefined => {
  if (providedAuthConfig || authModes) {
    return;
  }
  return {
    expires: Duration.days(DEFAULT_API_KEY_EXPIRATION_DAYS),
  };
};

/**
 * Convert to CDK AuthorizationModes.
 */
export const convertAuthorizationModesToCDK = (
  functionInstanceProvider: FunctionInstanceProvider,
  authResources: ProvidedAuthConfig | undefined,
  authModes: AuthorizationModes | undefined
): CDKAuthorizationModes => {
  const defaultAuthorizationMode =
    authModes?.defaultAuthorizationMode ??
    computeDefaultAuthorizationMode(authResources, authModes);
  const apiKeyConfig = authModes?.apiKeyAuthorizationMode
    ? convertApiKeyAuthConfigToCDK(authModes.apiKeyAuthorizationMode)
    : computeApiKeyAuthFromResource(authResources, authModes);
  const userPoolConfig = computeUserPoolAuthFromResource(authResources);
  const iamConfig = computeIAMAuthFromResource(authResources, authModes);
  const lambdaConfig = authModes?.lambdaAuthorizationMode
    ? convertLambdaAuthorizationConfigToCDK(
        functionInstanceProvider,
        authModes.lambdaAuthorizationMode
      )
    : undefined;
  const oidcConfig = authModes?.oidcAuthorizationMode
    ? convertOIDCAuthConfigToCDK(authModes.oidcAuthorizationMode)
    : undefined;

  return {
    ...(defaultAuthorizationMode ? { defaultAuthorizationMode } : undefined),
    ...(apiKeyConfig ? { apiKeyConfig } : undefined),
    ...(userPoolConfig ? { userPoolConfig } : undefined),
    ...(iamConfig ? { iamConfig } : undefined),
    ...(lambdaConfig ? { lambdaConfig } : undefined),
    ...(oidcConfig ? { oidcConfig } : undefined),
  };
};

/**
 * Return whether or not the api will use default API_KEY auth due to absence of auth resources and input auth-modes.
 * @param authResources the generated auth resources in the system
 * @param authModes the provided auth modes
 * @returns a boolean indicating whether or not default api key auth will be used.
 */
export const isUsingDefaultApiKeyAuth = (
  authResources: ProvidedAuthConfig | undefined,
  authModes: AuthorizationModes | undefined
): boolean => {
  return (
    authModes === undefined &&
    computeApiKeyAuthFromResource(authResources, authModes) !== undefined
  );
};
