import { Duration } from 'aws-cdk-lib';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { IRole } from 'aws-cdk-lib/aws-iam';
import {
  ApiKeyAuthorizationConfig as CDKApiKeyAuthorizationConfig,
  AuthorizationModes as CDKAuthorizationModes,
  IdentityPoolAuthorizationConfig as CDKIdentityPoolAuthorizationConfig,
  LambdaAuthorizationConfig as CDKLambdaAuthorizationConfig,
  OIDCAuthorizationConfig as CDKOIDCAuthorizationConfig,
  UserPoolAuthorizationConfig as CDKUserPoolAuthorizationConfig,
} from '@aws-amplify/data-construct';
import {
  AmplifyDataError,
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
import { AmplifyUserError } from '@aws-amplify/platform-core';

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
 *
 * Will default to userPool if userPool is provided and auth resources are not provided.
 *
 * If no auth resources are provided and there's only one mode we'll use that as we implicitly always add iam auth.
 */
const computeDefaultAuthorizationMode = (
  providedAuthConfig: ProvidedAuthConfig | undefined,
  authModes: AuthorizationModes | undefined
): DefaultAuthorizationMode | undefined => {
  if (isUsingDefaultApiKeyAuth(providedAuthConfig, authModes)) {
    return 'apiKey';
  } else if (providedAuthConfig && !authModes) {
    return 'userPool';
  } else if (
    !providedAuthConfig &&
    authModes &&
    Object.keys(authModes).length === 1
  ) {
    if (authModes.oidcAuthorizationMode) {
      return 'oidc';
    } else if (authModes.lambdaAuthorizationMode) {
      return 'lambda';
    } else if (authModes.apiKeyAuthorizationMode) {
      return 'apiKey';
    }
  }
  throw new AmplifyUserError<AmplifyDataError>('DefineDataConfigurationError', {
    message:
      'A defaultAuthorizationMode is required if multiple authorization modes are configured',
    resolution:
      "When calling 'defineData' specify 'authorizationModes.defaultAuthorizationMode'",
  });
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
 * Compute identity pool auth config from auth resource provider.
 * @returns an iam auth config, if relevant
 */
const computeIdentityPoolAuthFromResource = (
  providedAuthConfig: ProvidedAuthConfig | undefined
): CDKIdentityPoolAuthorizationConfig | undefined => {
  if (providedAuthConfig) {
    return {
      authenticatedUserRole: providedAuthConfig.authenticatedUserRole,
      unauthenticatedUserRole: providedAuthConfig.unauthenticatedUserRole,
      identityPoolId: providedAuthConfig.identityPoolId,
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
  if (isUsingDefaultApiKeyAuth(providedAuthConfig, authModes)) {
    return {
      expires: Duration.days(DEFAULT_API_KEY_EXPIRATION_DAYS),
    };
  }
  return;
};

const authorizationModeMapping = {
  iam: 'AWS_IAM',
  identityPool: 'AWS_IAM',
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
  authModes: AuthorizationModes | undefined
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
  const identityPoolConfig = computeIdentityPoolAuthFromResource(authResources);
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
    ...(identityPoolConfig ? { identityPoolConfig } : undefined),
    ...(lambdaConfig ? { lambdaConfig } : undefined),
    ...(oidcConfig ? { oidcConfig } : undefined),
    iamConfig: {
      enableIamAuthorizationMode: true,
    },
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
  return authModes === undefined && authResources === undefined;
};
