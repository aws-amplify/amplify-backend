import { aws_cognito as cognito } from 'aws-cdk-lib';
import { AuthUserAttribute } from './attributes.js';
/**
 * Email login options.
 *
 * If true, email login will be enabled with default settings.
 * If settings are provided, email login will be enabled with the specified settings.
 */
export type EmailLogin =
  | true
  | {
      emailBody?: `${string}{####}${string}`;
      emailStyle?: cognito.VerificationEmailStyle.CODE;
      emailSubject?: string;
    }
  | {
      emailBody?: `${string}{##Verify Email##}${string}`;
      emailStyle?: cognito.VerificationEmailStyle.LINK;
      emailSubject?: string;
    };
/**
 * Phone number login options.
 *
 * If true, phone number login will be enabled with default settings.
 * If settings are provided, phone number login will be enabled with the specified settings.
 */
export type PhoneNumberLogin =
  | true
  | {
      verificationMessage?: `${string}{####}${string}`;
    };
/**
 * Basic login options require at least email or phone number.
 * Additional settings may be configured, such as email messages or sms verification messages.
 */
export type BasicLoginOptions =
  | { email: EmailLogin; phoneNumber?: PhoneNumberLogin }
  | { email?: EmailLogin; phoneNumber: PhoneNumberLogin };

/**
 * TOTP and SMS settings for MFA
 */
export type MFASettings =
  | { totp: boolean; sms: true; smsMessage?: `${string}{####}${string}` }
  | { totp: boolean; sms: false };
/**
 * MFA Settings
 */
export type MFA =
  | { enforcementType: 'OFF' }
  | ({ enforcementType: 'OPTIONAL' | 'REQUIRED' } & MFASettings);
/**
 * External auth provider options
 */
export type ExternalProviders = {
  externalProviders?: {
    google?: Omit<cognito.UserPoolIdentityProviderGoogleProps, 'userPool'>;
    facebook?: Omit<cognito.UserPoolIdentityProviderFacebookProps, 'userPool'>;
    amazon?: Omit<cognito.UserPoolIdentityProviderAmazonProps, 'userPool'>;
    apple?: Omit<cognito.UserPoolIdentityProviderAppleProps, 'userPool'>;
    oidc?: Omit<cognito.UserPoolIdentityProviderOidcProps, 'userPool'>;
    saml?: Omit<cognito.UserPoolIdentityProviderSamlProps, 'userPool'>;
    // general configuration
    scopes?: cognito.OAuthScope[];
    callbackUrls?: string[];
    logoutUrls?: string[];
  };
};

/**
 * Input props for the AmplifyAuth construct
 */
export type AuthProps = {
  loginWith: BasicLoginOptions & ExternalProviders;
  /**
   * Additional settings
   */
  userAttributes?: AuthUserAttribute[];
  /**
   * Multifactor Authentication settings
   */
  multifactor?: MFA;
  /**
   * Determined how a user is able to recover their account by setting the account recovery setting.
   *
   * If no setting is provided, a default will be set based on the enabled login methods.
   * When email and phone login methods are both enabled, email will be the default recovery method.
   * If only email or phone are enabled, they will be the default recovery methods.
   */
  accountRecovery?: cognito.AccountRecovery;
};
