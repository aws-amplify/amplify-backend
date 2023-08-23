import { aws_cognito as cognito } from 'aws-cdk-lib';
import { UserPoolProps } from 'aws-cdk-lib/aws-cognito';
/**
 * Email login options.
 */
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
/**
 * Phone number login options.
 */
type PhoneNumberLogin =
  | { enabled: false }
  | {
      enabled: true;
      autoVerify?: {
        enabled: boolean;
        smsMessage?: string;
      };
    };
/**
 * Basic login options require at least email or phone number.
 * Additional settings may be configured, such as password policies.
 */
type BasicLoginOptions = (
  | { email: EmailLogin; phoneNumber?: PhoneNumberLogin }
  | { email?: EmailLogin; phoneNumber: PhoneNumberLogin }
) & {
  settings?: {
    passwordPolicy?: UserPoolProps['passwordPolicy'];
  };
};

/**
 * Input props for the AmplifyAuth construct.
 */
export type AmplifyAuthProps = {
  /**
   * One of email or phone number, and other optional identity providers
   */
  loginOptions: {
    basic: BasicLoginOptions;
  };
};
