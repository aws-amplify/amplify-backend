import { SecretValue, aws_cognito as cognito } from 'aws-cdk-lib';
import { triggerEvents } from './trigger_events.js';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { AuthOutput } from '@aws-amplify/backend-output-schemas';
import {
  StandardAttributes,
  UserPoolIdentityProviderSamlMetadata,
} from 'aws-cdk-lib/aws-cognito';

/**
 * Email login settings object
 */
export type EmailLoginSettings = {
  /**
   * The type of verification. Must be one of "CODE" or "LINK".
   */
  verificationEmailStyle?: 'CODE' | 'LINK';
  /**
   * Customize your verification emails.
   * Use the code or link parameter to inject verification codes or links into the user verification email.
   * @example
   * verificationEmailStyle: "CODE",
   * verificationEmailBody: (code: string) => `Your verification code is ${code}.`
   * @example
   * verificationEmailStyle: "LINK",
   * verificationEmailBody: (link: string) => `Your verification link is ${link}.`
   */
  verificationEmailBody?: (codeOrLink: string) => string;
  /**
   * The verification email subject.
   */
  verificationEmailSubject?: string;
};
/**
 * Email login options.
 *
 * If true, email login will be enabled with default settings.
 * If settings are provided, email login will be enabled with the specified settings.
 */
export type EmailLogin = true | EmailLoginSettings;
/**
 * Phone number login options.
 *
 * If true, phone number login will be enabled with default settings.
 * If settings are provided, phone number login will be enabled with the specified settings.
 */
export type PhoneNumberLogin =
  | true
  | {
      /**
       * The message template for the verification SMS sent to the user upon sign up.
       * @default
       * // If VerificationEmailStyle.LINK is chosen, verificationMessage will not be configured by default.
       *
       * // If VerificationEmailStyle.CODE is chosen, the default function will be as follows:
       * (code) => `The verification code to your new account is ${code}`
       */
      verificationMessage?: (code: string) => string;
    };

/**
 * Configure the MFA types that users can use. Ignored if MFA mode is set to OFF.
 */
export type MFASettings = {
  /**
   * If true, the MFA token is a time-based one time password that is generated by a hardware or software token
   * @see - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa-totp.html
   * @default false
   */
  totp?: boolean;
  /**
   * If true, or if a settings object is provided, the MFA token is sent to the user via SMS to their verified phone numbers.
   * @see - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa-sms-text-message.html
   */
  sms:
    | boolean
    | {
        /**
         * The SMS message template sent during MFA verification.
         * Use the code parameter in the template where Cognito should insert the verification code.
         * @default
         * smsMessage: (code: string) => `Your authentication code is ${code}.`
         */
        smsMessage: (code: string) => string;
      };
};
/**
 * MFA Settings
 */
export type MFA = {
  /**
   * Configure whether users can or are required to use multifactor (MFA) to sign in.
   * @default - 'OFF'
   */
  mode: 'OFF' | 'OPTIONAL' | 'REQUIRED';
} & MFASettings;

/**
 * Google provider.
 */
export type GoogleProviderProps = Omit<
  cognito.UserPoolIdentityProviderGoogleProps,
  'userPool' | 'clientSecretValue' | 'clientSecret'
> & {
  /**
   * The client secret to be accompanied with clientId for Google APIs to authenticate the client as SecretValue
   * @see https://developers.google.com/identity/sign-in/web/sign-in
   * @default none
   */
  clientSecret?: SecretValue;
};

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
  'userPool' | 'metadata'
> & {
  /**
   * The SAML metadata.
   */
  metadata: Omit<UserPoolIdentityProviderSamlMetadata, 'metadataType'> & {
    /**
     * Metadata types that can be used for a SAML user pool identity provider.
     * @example 'URL'
     *
     * For details about each option, see below.
     *
     * 'URL' - Metadata provided via a URL.
     * 'FILE' - Metadata provided via the contents of a file.
     */
    metadataType: 'URL' | 'FILE';
  };
};

/**
 * External provider options.
 */
export type ExternalProviderOptions = {
  /**
   * Google OAuth Settings
   */
  google?: GoogleProviderProps;
  /**
   * Facebook OAuth Settings
   */
  facebook?: FacebookProviderProps;
  /**
   * LoginWithAmazon Settings
   */
  loginWithAmazon?: AmazonProviderProps;
  /**
   * SignInWithApple Settings
   */
  signInWithApple?: AppleProviderProps;
  /**
   * OIDC Settings
   */
  oidc?: OidcProviderProps;
  /**
   * SAML Settings
   */
  saml?: SamlProviderProps;
  /**
   * OAuth scopes that will be allowed with the app client.
   * @example ['PROFILE']
   *
   * For details about each scope, see below.
   *
   * 'PHONE' - Grants access to the 'phone_number' and 'phone_number_verified' claims.
   * Automatically includes access to `OAuthScope.OPENID`.
   *
   * 'EMAIL' - Grants access to the 'email' and 'email_verified' claims.
   * Automatically includes access to `OAuthScope.OPENID`.
   *
   * 'OPENID' - Returns all user attributes in the ID token that are readable by the client
   *
   * 'PROFILE' - Grants access to all user attributes that are readable by the client
   * Automatically includes access to `OAuthScope.OPENID`.
   *
   * 'COGNITO_ADMIN' - Grants access to Amazon Cognito User Pool API operations that require access tokens,
   * such as UpdateUserAttributes and VerifyUserAttribute.
   */
  scopes?: ('PHONE' | 'EMAIL' | 'OPENID' | 'PROFILE' | 'COGNITO_ADMIN')[];
  /**
   * List of allowed redirect URLs for the identity providers.
   */
  callbackUrls: string[];
  /**
   * You must provide a unique domain prefix for the Hosted UI that Cognito will use for external login providers.
   * If you do not provide a domain prefix, it will not be configured, and some external login flows will not work.
   *
   * NOTE: If you need to update this in the future, you must first unset it, then deploy the change to remove the domain
   * from the UserPool. After the domain has been removed, you can then provide a new value, and perform another deployment.
   */
  domainPrefix?: string;
  /**
   * List of allowed logout URLs for the identity providers.
   */
  logoutUrls: string[];
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
   * Specify how you would like users to log in. You can choose from email, phone, and even external providers such as LoginWithAmazon.
   */
  loginWith: {
    /**
     * Email login options.
     *
     * If true, email login will be enabled with default settings.
     * If settings are provided, email login will be enabled with the specified settings.
     */
    email?: EmailLogin;
    /**
     * Phone number login options.
     *
     * If true, phone number login will be enabled with default settings.
     * If settings are provided, phone number login will be enabled with the specified settings.
     */
    phone?: PhoneNumberLogin;
    /**
     * Configure OAuth, OIDC, and SAML login providers
     */
    externalProviders?: ExternalProviderOptions;
  };
  /**
   * The set of attributes that are required for every user in the user pool. Read more on attributes here - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
   * @default - email/phone will be added as required user attributes if they are included as login methods
   */
  userAttributes?: StandardAttributes;
  /**
   * Configure whether users can or are required to use multifactor (MFA) to sign in.
   */
  multifactor?: MFA;
  /**
   * Determined how a user is able to recover their account by setting the account recovery setting.
   *
   * If no setting is provided, a default will be set based on the enabled login methods.
   * When email and phone login methods are both enabled, email will be the default recovery method.
   * If only email or phone are enabled, they will be the default recovery methods.
   * @example
   * "EMAIL_ONLY"
   *
   * For details about each option, see below.
   *
   * 'EMAIL_AND_PHONE_WITHOUT_MFA' - Email if available, otherwise phone, but does not allow a user to reset their password via phone if they are also using it for MFA
   *
   * 'PHONE_WITHOUT_MFA_AND_EMAIL' - Phone if available, otherwise email, but does not allow a user to reset their password via phone if they are also using it for MFA
   *
   * 'EMAIL_ONLY' - Email only
   *
   * 'PHONE_ONLY_WITHOUT_MFA' - Phone only, but does not allow a user to reset their password via phone if they are also using it for MFA
   *
   * 'PHONE_AND_EMAIL' - (Not Recommended) Phone if available, otherwise email, and do allow a user to reset their password via phone if they are also using it for MFA.
   *
   * 'NONE' - None – users will have to contact an administrator to reset their passwords
   */
  accountRecovery?: keyof typeof cognito.AccountRecovery;

  /**
   * @internal
   */
  outputStorageStrategy?: BackendOutputStorageStrategy<AuthOutput>;
};
