import { aws_cognito as cognito } from 'aws-cdk-lib';
import { UserPoolProps } from 'aws-cdk-lib/aws-cognito';
type AmplifyFunc = { name: string };
// these properties come directly from the L2's UserPoolProps without any modifications
type UserPoolDefaultProps = Pick<
  UserPoolProps,
  | 'selfSignUpEnabled'
  | 'accountRecovery'
  | 'passwordPolicy'
  | 'customAttributes'
  | 'deviceTracking'
  | 'standardAttributes'
>;
type MFASettings =
  | { totp: boolean; sms: true; smsMessage?: string }
  | { totp: boolean; sms: false };
type MFA =
  | { enforcementType: 'OFF' } // off
  | ({ enforcementType: 'OPTIONAL' | 'REQUIRED' } & MFASettings);
type EmailLogin =
  | { enabled: false }
  | {
      enabled: true;
      autoVerify?: {
        enabled: boolean;
        emailBody?: string;
        emailStyle?: cognito.VerificationEmailStyle;
        emailSubject?: string;
      };
    };
type PhoneNumberLogin =
  | { enabled: false }
  | {
      enabled: true;
      autoVerify?: {
        enabled: boolean;
        smsMessage?: string;
      };
    };
type BasicLoginOptions = (
  | { email: EmailLogin; phoneNumber?: PhoneNumberLogin }
  | { email?: EmailLogin; phoneNumber: PhoneNumberLogin }
) & {
  settings?: {
    passwordPolicy?: UserPoolProps['passwordPolicy'];
  };
};
type OAuthLoginOptions = {
  // IDPs
  google?: Omit<cognito.UserPoolIdentityProviderGoogleProps, 'userPool'>;
  facebook?: Omit<cognito.UserPoolIdentityProviderFacebookProps, 'userPool'>;
  amazon?: Omit<cognito.UserPoolIdentityProviderAmazonProps, 'userPool'>;
  apple?: Omit<cognito.UserPoolIdentityProviderAppleProps, 'userPool'>;
  // general configuration
  scopes?: cognito.OAuthScope[];
  callbackUrls: string[];
  logoutUrls: string[];
};

// Developer Types must be testable, strictly typed
export type AmplifyAuthPropsV3 = UserPoolDefaultProps & {
  /**
   * One of email or phone number, and other optional identity providers
   */
  loginOptions: {
    basic: BasicLoginOptions;
    oauth?: OAuthLoginOptions;
    oidc?: Omit<cognito.UserPoolIdentityProviderOidcProps, 'userPool'>;
    saml?: Omit<cognito.UserPoolIdentityProviderSamlProps, 'userPool'>;
  };
  /**
   * Multifactor with SMS or TOTP
   */
  multifactor?: MFA;

  triggers?: {
    preSignUp?: AmplifyFunc;
    postConfirmation?: AmplifyFunc;
  };
  guestAccess?: boolean;
  identityPool?: {
    allowUnauthenticatedIdentities: boolean;
  };
};

// User Experience Layer provides abstractions which make it easier for users to use
export type AmplifyAuthBasic = Pick<
  AmplifyAuthPropsV3,
  'loginOptions' | 'multifactor'
>;
// EXAMPLES
// const basicAuth: AmplifyAuthBasic = {
//     loginOptions: {
//         basic: {
//             email: {
//                 enabled: true,
//             },
//             phoneNumber: {
//                 enabled: true,
//             },
//         },
//         oauth: {
//             google: {
//                 clientId: "google-app-id",
//                 clientSecretValue: SecretValue.unsafePlainText("secret"),
//                 attributeMapping: {
//                     fullname: cognito.ProviderAttribute.GOOGLE_NAME
//                 },
//             },
//             facebook: {
//                 clientId: "facebook-app-id",
//                 clientSecret: "facebook-app-secret",
//             },
//             callbackUrls: ['https://my-app-domain.com/welcome'],
//             logoutUrls: ['https://my-app-domain.com/signin'],
//         },
//         oidc: {
//             clientId: "my-oauth-client-id",
//             clientSecret: "oauth-client-secret",
//             issuerUrl: "https://my-oauth-issuer-url.com/auth"
//         },
//         saml: {
//             metadata: {
//                 metadataContent: "",
//                 metadataType: cognito.UserPoolIdentityProviderSamlMetadataType.URL
//             }
//         }
//     },
// }
// // Advanced type is similar to "Overrides"; in reality, overrides is not necessary & is remnant of old CLI
// const advancedAuth: AmplifyAuthPropsV3 = {
//     loginOptions: {
//         basic: {
//             email: {
//                 enabled: true,
//                 autoVerify: {
//                     enabled: false,
//                     emailBody: ""
//                 }
//             },
//             phoneNumber: {
//                 enabled: true,
//                 autoVerify: {
//                     enabled: true,
//                 }
//             },
//             settings: {
//                 passwordPolicy: {
//                     minLength: 10
//                 }
//             }
//         },
//         oauth: {
//             google: {
//                 clientId: "google-app-id",
//                 clientSecretValue: SecretValue.unsafePlainText("secret"),
//                 attributeMapping: {
//                     fullname: cognito.ProviderAttribute.GOOGLE_NAME
//                 },
//             },
//             facebook: {
//                 clientId: "facebook-app-id",
//                 clientSecret: "facebook-app-secret",
//             },
//             callbackUrls: ['https://my-app-domain.com/welcome'],
//             logoutUrls: ['https://my-app-domain.com/signin'],
//         },
//         oidc: {
//             clientId: "my-oauth-client-id",
//             clientSecret: "oauth-client-secret",
//             issuerUrl: "https://my-oauth-issuer-url.com/auth"
//         },
//         saml: {
//             metadata: {
//                 metadataContent: "",
//                 metadataType: cognito.UserPoolIdentityProviderSamlMetadataType.URL
//             }
//         }
//     },
//     multifactor: {
//         enforcementType: "REQUIRED",
//         sms: true,
//         smsMessage: 'code is ${####}',
//         totp: true,
//     },
//     standardAttributes: {
//         givenName: {
//             required: true,
//             mutable: false,
//         }
//     },
//     customAttributes: {
//         myCustomAttributeName: {
//             bind: () => {
//                 return {
//                     dataType: "String", // String | Number | DateTime | Boolean
//                     mutable: false,
//                     numberConstraints: {
//                         min: 0,
//                         max: 10,
//                     },
//                     stringConstraints: {
//                         minLen: 0,
//                         maxLen: 10,
//                     },
//                 }
//             }
//         }
//     },
// }
