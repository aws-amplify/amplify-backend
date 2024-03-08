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
} from '@aws-amplify/data-construct';
import {
  ApiKeyAuthorizationModeProps,
  AuthorizationModes,
  DefaultAuthorizationMode,
  LambdaAuthorizationModeProps,
  OIDCAuthorizationModeProps,
} from './types.js';
import {
  AuthResources,
  ConstructFactoryGetInstanceProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';

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
      authResourceProvider.resources.cfnResources.cfnIdentityPool.ref,
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
  getInstanceProps: ConstructFactoryGetInstanceProps,
  {
    function: authFn,
    timeToLiveInSeconds = DEFAULT_LAMBDA_AUTH_TIME_TO_LIVE_SECONDS,
  }: LambdaAuthorizationModeProps
): CDKLambdaAuthorizationConfig => ({
  function: authFn.getInstance(getInstanceProps).resources.lambda,
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
  if (providedAuthConfig && !authModes) return 'userPool';
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
  authModes: AuthorizationModes | undefined,
  additionalRoles: IRole[] = []
): CDKIAMAuthorizationConfig | undefined => {
  if (providedAuthConfig) {
    const allowListedRoles = [
      ...(authModes?.allowListedRoleNames || []),
      ...additionalRoles,
    ];
    return {
      authenticatedUserRole: providedAuthConfig.authenticatedUserRole,
      unauthenticatedUserRole: providedAuthConfig.unauthenticatedUserRole,
      identityPoolId: providedAuthConfig.identityPoolId,
      allowListedRoles,
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

const authorizationModeMapping = {
  iam: 'AWS_IAM',
  userPool: 'AMAZON_COGNITO_USER_POOLS',
  oidc: 'OPENID_CONNECT',
  apiKey: 'API_KEY',
  lambda: 'AWS_LAMBDA',
} as const;

const convertAuthorizationModeToCDK = (mode?: DefaultAuthorizationMode) => {
  if (!mode) return;

  return authorizationModeMapping[mode];
};

/**
 * Convert to CDK AuthorizationModes.
 */
export const convertAuthorizationModesToCDK = (
  getInstanceProps: ConstructFactoryGetInstanceProps,
  authResources: ProvidedAuthConfig | undefined,
  authModes: AuthorizationModes | undefined,
  additionalRoles: IRole[] = []
): CDKAuthorizationModes => {
  const defaultAuthorizationMode =
    authModes?.defaultAuthorizationMode ??
    computeDefaultAuthorizationMode(authResources, authModes);
  const cdkAuthorizationMode = convertAuthorizationModeToCDK(
    defaultAuthorizationMode
  );
  const apiKeyConfig = authModes?.apiKeyAuthorizationMode
    ? convertApiKeyAuthConfigToCDK(authModes.apiKeyAuthorizationMode)
    : computeApiKeyAuthFromResource(authResources, authModes);
  const userPoolConfig = computeUserPoolAuthFromResource(authResources);
  const iamConfig = computeIAMAuthFromResource(
    authResources,
    authModes,
    additionalRoles
  );
  const lambdaConfig = authModes?.lambdaAuthorizationMode
    ? convertLambdaAuthorizationConfigToCDK(
        getInstanceProps,
        authModes.lambdaAuthorizationMode
      )
    : undefined;
  const oidcConfig = authModes?.oidcAuthorizationMode
    ? convertOIDCAuthConfigToCDK(authModes.oidcAuthorizationMode)
    : undefined;

  return {
    ...(cdkAuthorizationMode
      ? { defaultAuthorizationMode: cdkAuthorizationMode }
      : undefined),
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
