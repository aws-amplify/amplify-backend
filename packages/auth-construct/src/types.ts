import { aws_cognito as cognito } from 'aws-cdk-lib';
import { AuthUserAttribute } from './attributes.js';
import { triggerEvents } from './trigger_events.js';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { AuthOutput } from '@aws-amplify/backend-output-schemas/auth';

/**
 * Email login options.
 *
 * If true, email login will be enabled with default settings.
 * If settings are provided, email login will be enabled with the specified settings.
 */
export type EmailLogin =
  | true
  | {
      /**
       * The type of verification. Must be one of aws_cognito.VerificationEmailStyle.
       */
      verificationEmailStyle?: cognito.VerificationEmailStyle.CODE;
      /**
       * When verificationEmailStyle is set to VerificationEmailStyle.CODE, the emailBody must contain the template {####} where the code will be inserted.
       */
      verificationEmailBody?: `${string}{####}${string}`;
      /**
       * The verification email subject.
       */
      verificationEmailSubject?: string;
    }
  | {
      verificationEmailStyle?: cognito.VerificationEmailStyle.LINK;
      /**
       * When verificationEmailStyle is set to VerificationEmailStyle.LINK, the emailBody must contain the template {##Verify Email##} where the link will be inserted.
       */
      verificationEmailBody?: `${string}{##Verify Email##}${string}`;
      verificationEmailSubject?: string;
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
 * Google provider.
 */
export type GoogleProviderProps = Omit<
  cognito.UserPoolIdentityProviderGoogleProps,
  'userPool'
>;

/**
 * Apple provider.
 */
export type AppleProviderProps = Omit<
  cognito.UserPoolIdentityProviderAppleProps,
  'userPool'
>;

/**
 * Amazon provider.
 */
export type AmazonProviderProps = Omit<
  cognito.UserPoolIdentityProviderAmazonProps,
  'userPool'
>;

/**
 * Facebook provider.
 */
export type FacebookProviderProps = Omit<
  cognito.UserPoolIdentityProviderFacebookProps,
  'userPool'
>;

/**
 * OIDC provider.
 */
export type OidcProviderProps = Omit<
  cognito.UserPoolIdentityProviderOidcProps,
  'userPool'
>;

/**
 * SAML provider.
 */
export type SamlProviderProps = Omit<
  cognito.UserPoolIdentityProviderSamlProps,
  'userPool'
>;

/**
 * External provider options.
 */
export type ExternalProviderOptions = {
  /* eslint-disable @typescript-eslint/naming-convention */
  Google?: GoogleProviderProps;
  /* eslint-disable @typescript-eslint/naming-convention */
  Facebook?: FacebookProviderProps;
  /* eslint-disable @typescript-eslint/naming-convention */
  LoginWithAmazon?: AmazonProviderProps;
  /* eslint-disable @typescript-eslint/naming-convention */
  SignInWithApple?: AppleProviderProps;
  oidc?: OidcProviderProps;
  saml?: SamlProviderProps;
  // general configuration
  scopes?: cognito.OAuthScope[];
  callbackUrls?: string[];
  logoutUrls?: string[];
};

/**
 * External auth provider.
 */
export type ExternalProviderProps = {
  externalProviders?: ExternalProviderOptions;
};

/**
 * Union type of all supported auth trigger events
 */
export type TriggerEvent = (typeof triggerEvents)[number];

/**
 * Input props for the AmplifyAuth construct
 */
export type AuthProps = {
  loginWith: BasicLoginOptions & ExternalProviderProps;
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

  outputStorageStrategy?: BackendOutputStorageStrategy<AuthOutput>;
};
