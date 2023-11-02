import { AuthorizationModes } from '@aws-amplify/graphql-api-construct';

/**
 * Admin roles require iam config be specified.
 */
const validateAdminRolesHaveIAMAuthorizationConfig = (
  authorizationModes: AuthorizationModes
): void => {
  if (
    authorizationModes.adminRoles &&
    authorizationModes.adminRoles.length > 0 &&
    !authorizationModes.iamConfig
  ) {
    throw new Error(
      'Specifying adminRoleNames requires presence of IAM Authorization config. Either add Auth to the project, or specify an iamConfig in the authorizationModes.'
    );
  }
};

/**
 * At least one auth mode is required on the API, otherwise an exception will be thrown.
 */
const validateAtLeastOneAuthModeIsConfigured = ({
  iamConfig,
  lambdaConfig,
  userPoolConfig,
  oidcConfig,
  apiKeyConfig,
}: AuthorizationModes): void => {
  if (
    !iamConfig &&
    !lambdaConfig &&
    !userPoolConfig &&
    !oidcConfig &&
    !apiKeyConfig
  ) {
    throw new Error(
      'At least one authorization mode is required on the API. Either add Auth to the project to get IAM and UserPool authorization, or override the authorization modes specifying at least one auth mode.'
    );
  }
};

/**
 * Validate that authorization modes are internally consistent, and provided useful errors to the caller.
 * @param authorizationModes the auth modes to verify
 */
export const validateAuthorizationModes = (
  authorizationModes: AuthorizationModes
): void =>
  [
    validateAdminRolesHaveIAMAuthorizationConfig,
    validateAtLeastOneAuthModeIsConfigured,
  ].forEach((validate) => validate(authorizationModes));
