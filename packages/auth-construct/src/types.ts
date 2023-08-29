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
 * Input props for the AmplifyAuth construct.
 */
export type AuthProps = {
  loginWith: BasicLoginOptions;
  /**
   * Additional settings.
   */
  userAttributes?: AuthUserAttribute[];
};
