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

/**
 * Convert to CDK ApiKeyAuthorizationConfig.
 */
const convertApiKeyAuthConfigToCDK = ({
  description,
  expiresInDays = 7,
}: ApiKeyAuthorizationConfig): CDKApiKeyAuthorizationConfig => ({
  description,
  expires: Duration.days(expiresInDays),
});

/**
 * Convert to CDK LambdaAuthorizationConfig.
 */
const convertLambdaAuthorizationConfigToCDK = (
  functionInstanceProvider: FunctionInstanceProvider,
  { function: authFn, timeToLiveInSeconds = 60 }: LambdaAuthorizationConfig
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
 */
const computeDefaultAuthorizationMode = ({
  userPool,
  authenticatedUserRole,
  unauthenticatedUserRole,
  identityPoolId,
}: ProvidedAuthResources): DefaultAuthorizationMode => {
  if (userPool) return 'AMAZON_COGNITO_USER_POOLS';
  if (authenticatedUserRole && unauthenticatedUserRole && identityPoolId)
    return 'AWS_IAM';
  return 'API_KEY';
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
const computeApiKeyAuthFromResource = ({
  userPool,
  authenticatedUserRole,
  unauthenticatedUserRole,
  identityPoolId,
}: ProvidedAuthResources): CDKApiKeyAuthorizationConfig | undefined => {
  if (
    userPool ||
    authenticatedUserRole ||
    unauthenticatedUserRole ||
    identityPoolId
  ) {
    return;
  }
  return {
    expires: Duration.days(7),
  };
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
    computeDefaultAuthorizationMode(authResources);
  const apiKeyConfig = authModes?.apiKeyConfig
    ? convertApiKeyAuthConfigToCDK(authModes.apiKeyConfig)
    : computeApiKeyAuthFromResource(authResources);
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
  return {
    defaultAuthorizationMode,
    ...(apiKeyConfig ? { apiKeyConfig } : undefined),
    ...(userPoolConfig ? { userPoolConfig } : undefined),
    ...(iamConfig ? { iamConfig } : undefined),
    ...(lambdaConfig ? { lambdaConfig } : undefined),
    ...(oidcConfig ? { oidcConfig } : undefined),
    ...(adminRoles ? { adminRoles } : undefined),
  };
};
