import { aws_cognito as cognito } from 'aws-cdk-lib';
import { AmplifyUserAttribute } from './user-attributes/custom_attributes.js';
/**
 * Email login options.
 *
 * If true, email login will be enabled with default settings.
 * If settings are provided, email login will be enabled with the specified settings.
 */
export type EmailLogin =
  | true
  | {
      emailBody?: string;
      emailStyle?: cognito.VerificationEmailStyle;
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
 * Additional settings may be configured, such as password policies.
 */
export type BasicLoginOptions =
  | { email: EmailLogin; phoneNumber?: PhoneNumberLogin }
  | { email?: EmailLogin; phoneNumber: PhoneNumberLogin };

/**
 * Input props for the AmplifyAuth construct.
 */
export type AmplifyAuthProps = {
  loginWith: BasicLoginOptions;
  /**
   * Additional settings.
   */
  userAttributes?: AmplifyUserAttribute[];
};
