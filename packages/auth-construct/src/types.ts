import { aws_cognito as cognito } from 'aws-cdk-lib';
import { triggerEvents } from './trigger_events.js';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { AuthOutput } from '@aws-amplify/backend-output-schemas/auth';
import { StandardAttributes } from 'aws-cdk-lib/aws-cognito';

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
      verificationEmailStyle?: cognito.VerificationEmailStyle;
      /**
       * When verificationEmailStyle is set to VerificationEmailStyle.CODE, the emailBody must contain the template {####} where the code will be inserted.
       * When verificationEmailStyle is set to VerificationEmailStyle.LINK, the emailBody must contain the template {##Verify Email##} where the link will be inserted.
       */
      verificationEmailBody?: string;
      /**
       * The verification email subject.
       */
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
      verificationMessage?: string;
    };
/**
 * Basic login options require at least email or phone number.
 * Additional settings may be configured, such as email messages or sms verification messages.
 */
export type BasicLoginOptions =
  | { email: EmailLogin; phoneNumber?: PhoneNumberLogin }
  | { email?: EmailLogin; phoneNumber: PhoneNumberLogin };

/**
 * Configure the MFA types that users can use. Ignored if MFA enforcementType is set to OFF.
 */
export type MFASettings = {
  /**
   * The MFA token is a time-based one time password that is generated by a hardware or software token
   * @see - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa-totp.html
   */
  totp: boolean;
  /**
   * The MFA token is sent to the user via SMS to their verified phone numbers
   * @see - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa-sms-text-message.html
   */
  sms:
    | boolean
    | {
        /**
         * The SMS message template sent during MFA verification. Use '{####}' in the template where Cognito should insert the verification code.
         * @default
         * 'Your authentication code is {####}.'
         */
        smsMessage: string;
      };
};
/**
 * MFA Settings
 */
export type MFA = {
  /**
   * Configure whether users of this user pool can or are required use MFA to sign in.
   * @default - 'OFF'
   */
  enforcementType: 'OFF' | 'OPTIONAL' | 'REQUIRED';
} & MFASettings;

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
  google?: GoogleProviderProps;
  facebook?: FacebookProviderProps;
  loginWithAmazon?: AmazonProviderProps;
  signInWithApple?: AppleProviderProps;
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
  /**
   * Specify the allowed login mechanisms
   */
  loginWith: BasicLoginOptions & ExternalProviderProps;
  /**
   * The set of attributes that are required for every user in the user pool. Read more on attributes here - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
   * @default - email/phone will be added as required user attributes if they are included as login methods
   */
  userAttributes?: StandardAttributes;
  /**
   * Configure whether users can or are required to use MFA to sign in.
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
