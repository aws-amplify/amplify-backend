import { aws_cognito as cognito } from 'aws-cdk-lib';
import { UserPoolProps } from 'aws-cdk-lib/aws-cognito';
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
export type AmplifyAuthProps = BasicLoginOptions & {
  /**
   * Additional settings.
   */
  settings?: {
    /**
     * Specify which user attributes are required for registration/login and if they are mutable.
     * By default, email and phone number are required and mutable if they are enabled login types.
     */
    standardAttributes?: UserPoolProps['standardAttributes'];
    /**
     * Specify custom attributes.
     */
    customAttributes?: UserPoolProps['customAttributes'][];
  };
};
