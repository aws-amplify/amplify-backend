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
 * External auth provider options
 */
export type ExternalProviders = {
  externalProviders?: {
    /**
     * Add Google sign-in
     * @see https://developers.google.com/identity/sign-in/web/sign-in
     */
    google?: Omit<cognito.UserPoolIdentityProviderGoogleProps, 'userPool'>;
    /**
     * Add Facebook Login
     * @see https://developers.facebook.com/docs/facebook-login/
     */
    facebook?: Omit<cognito.UserPoolIdentityProviderFacebookProps, 'userPool'>;
    /**
     * Add Login with Amazon
     * @see https://developer.amazon.com/docs/login-with-amazon/documentation-overview.html
     */
    amazon?: Omit<cognito.UserPoolIdentityProviderAmazonProps, 'userPool'>;
    /**
     * Add Sign in with Apple
     * @see https://developer.apple.com/sign-in-with-apple/
     */
    apple?: Omit<cognito.UserPoolIdentityProviderAppleProps, 'userPool'>;
    /**
     * Add an OpenID Connect provider
     * @see https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-oidc-idp.html
     */
    oidc?: Omit<cognito.UserPoolIdentityProviderOidcProps, 'userPool'>;
    /**
     * Add a SAML provider
     * @see https://docs.aws.amazon.com/cognito/latest/developerguide/saml-identity-provider.html
     */
    saml?: Omit<cognito.UserPoolIdentityProviderSamlProps, 'userPool'>;
    /**
     *
     * OAuth scopes that are allowed with this client.
     * @see https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-app-idp-settings.html
     */
    scopes?: cognito.OAuthScope[];
    /**
     * Application URLs to redirect users after logging in
     */
    callbackUrls?: string[];
    /**
     * Application URLs to redirect users after logging out
     */
    logoutUrls?: string[];
  };
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
   * Define how users will log in to your application
   * @default { email: true }
   */
  loginWith: BasicLoginOptions & ExternalProviders;
  /**
   * Attributes that are set on users. User attributes can either be required or optional
   * @example AmplifyAuth.attribute('email').required()
   * @example AmplifyAuth.attribute('birthday')
   */
  userAttributes?: AuthUserAttribute[];
  /**
   * Multi-factor Authentication settings
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
