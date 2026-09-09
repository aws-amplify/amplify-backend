import { AuthProps } from './types.js';

/**
 * These are the Amplify provided default values for Auth.
 */
export const DEFAULTS = {
  /**
   * Default Auth Props if customer does not provide any.
   */
  IF_NO_PROPS_PROVIDED: { loginWith: { email: true } } as AuthProps,
  /**
   * Sign in case sensitivity
   */
  SIGN_IN_CASE_SENSITIVE: false,
  /**
   * Specifies if users can sign up on their own.
   * If set to false, users will not be able to register, and will require an admin to create
   * their account.
   */
  ALLOW_SELF_SIGN_UP: true,
  /**
   * Specifies whether the identity pool should support unauthenticated identities
   */
  ALLOW_UNAUTHENTICATED_IDENTITIES: true,
  /**
   * Specifies whether user existence errors should be shown.
   * Enabling this protects users as it does not allow attackers to know if users
   * are created in the backend.
   */
  PREVENT_USER_EXISTENCE_ERRORS: true,
  /**
   * Default password policy
   */
  PASSWORD_POLICY: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireDigits: true,
    requireSymbols: true,
  },
  /**
   * Specifies if SRP or custom logins should be enabled.
   */
  AUTH_FLOWS: {
    userSrp: true,
    custom: true,
  },
  /**
   * Default OAUTH flows for the UserPool
   */
  OAUTH_FLOWS: {
    authorizationCodeGrant: true,
    implicitCodeGrant: false,
  },
  /**
   * Specifies if attributes are required for signup/login, may depend on which settings are enabled.
   */
  IS_REQUIRED_ATTRIBUTE: {
    email: (emailEnabled: boolean) =>
      emailEnabled ? { required: true, mutable: true } : undefined,
    phoneNumber: (phoneNumberEnabled: boolean) =>
      phoneNumberEnabled ? { required: true, mutable: true } : undefined,
  },
};
