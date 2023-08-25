// import { UserPoolClientOptions, UserPoolProps } from 'aws-cdk-lib/aws-cognito';
// import { AmplifyAuthProps } from './types.js';
// type StandardAttribute = { required: boolean; mutable: boolean } | undefined;
// type Defaults = {
//   IF_NO_PROPS_PROVIDED: AmplifyAuthProps;
//   SIGN_IN_CASE_SENSITIVE: boolean;
//   ALLOW_UNAUTHENTICATED_IDENTITIES: boolean;
//   PASSWORD_POLICY: UserPoolProps['passwordPolicy'];
//   AUTH_FLOWS: UserPoolClientOptions['authFlows'];
//   IS_REQUIRED_ATTRIBUTE: {
//     email: (emailEnabled: boolean) => StandardAttribute;
//     phoneNumber: (phoneNumberEnabled: boolean) => StandardAttribute;
//   };
// };
/**
 * These are the Amplify provided default values for Auth.
 */
export const DEFAULTS = {
  /**
   * Default Auth Props if customer does not provide any.
   */
  IF_NO_PROPS_PROVIDED: { email: true },
  /**
   * Sign in case sensitivity
   */
  SIGN_IN_CASE_SENSITIVE: false,
  /**
   * Specifies whether the identity pool should support unauthenticated identities
   */
  ALLOW_UNAUTHENTICATED_IDENTITIES: false,
  /**
   * Default password policy
   */
  PASSWORD_POLICY: {
    minLength: 8,
    requireLowercase: false,
    requireUppercase: false,
    requireDigits: false,
    requireSymbols: false,
  },
  /**
   * Specifies if SRP or custom logins should be enabled.
   */
  AUTH_FLOWS: {
    userSrp: true,
    custom: true,
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
