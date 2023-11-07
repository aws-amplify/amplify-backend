import { AuthorizationModes as CDKAuthorizationModes } from '@aws-amplify/graphql-api-construct';
import { AuthorizationModes } from './types.js';

type AuthorizationModeValidator = (
  inputAuthorizationModes: AuthorizationModes | undefined,
  transformedAuthorizationModes: CDKAuthorizationModes
) => void;

/**
 * Admin roles require iam config be specified.
 */
const validateAdminRolesHaveIAMAuthorizationConfig: AuthorizationModeValidator =
  (
    inputAuthorizationModes: AuthorizationModes | undefined,
    transformedAuthorizationModes: CDKAuthorizationModes
  ): void => {
    if (
      inputAuthorizationModes?.allowListedRoleNames &&
      inputAuthorizationModes?.allowListedRoleNames.length > 0 &&
      !transformedAuthorizationModes.iamConfig
    ) {
      throw new Error(
        'Specifying allowListedRoleNames requires presence of IAM Authorization config. Auth must be added to the backend.'
      );
    }
  };

/**
 * At least one auth mode is required on the API, otherwise an exception will be thrown.
 */
const validateAtLeastOneAuthModeIsConfigured: AuthorizationModeValidator = (
  _: AuthorizationModes | undefined,
  {
    iamConfig,
    lambdaConfig,
    userPoolConfig,
    oidcConfig,
    apiKeyConfig,
  }: CDKAuthorizationModes
): void => {
  if (
    !iamConfig &&
    !lambdaConfig &&
    !userPoolConfig &&
    !oidcConfig &&
    !apiKeyConfig
  ) {
    throw new Error(
      'At least one authorization mode is required on the API. Either add Auth to the project to get IAM and UserPool authorization, or specify apiKeyConfig, lambdaConfig, or oidcConfig via authorization modes.'
    );
  }
};

/**
 * Validate that authorization modes are internally consistent, and provided useful errors to the caller.
 * @param inputAuthorizationModes the user provided auth mode overrides
 * @param transformedAuthorizationModes the transformed auth modes to verify
 */
export const validateAuthorizationModes = (
  inputAuthorizationModes: AuthorizationModes | undefined,
  transformedAuthorizationModes: CDKAuthorizationModes
): void =>
  [
    validateAdminRolesHaveIAMAuthorizationConfig,
    validateAtLeastOneAuthModeIsConfigured,
  ].forEach((validate) =>
    validate(inputAuthorizationModes, transformedAuthorizationModes)
  );
