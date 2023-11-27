import { OtpConfig, SesServiceConfig, SnsServiceConfig } from '../types.js';

/**
 * Passwordless Configuration.
 */
export class PasswordlessConfig {
  private minOtpLength = 6;
  private defaultSubject = 'Your verification code';

  /**
   * Creates a new instance of the PasswordlessConfig class.
   * @param env The environment variables.
   */
  constructor(private env: Record<string, string | undefined>) {}

  private parsedOtpConfig?: OtpConfig;

  private parsedSnsConfig?: SnsServiceConfig;

  private parsedSesConfig?: SesServiceConfig;

  /**
   * Gets the OTP configuration.
   */
  get otpConfig(): OtpConfig {
    if (this.parsedOtpConfig === undefined) {
      const { otpLength } = this.env;
      const parsed = parseInt(otpLength ?? '0');
      const input = isNaN(parsed) ? 0 : parsed;
      const length = Math.max(input, this.minOtpLength);
      this.parsedOtpConfig = {
        otpLength: length,
      };
    }

    return this.parsedOtpConfig;
  }

  /**
   * Gets the SNS configuration.
   */
  get snsConfig(): SnsServiceConfig {
    if (this.parsedSnsConfig === undefined) {
      const { originationNumber, senderId, smsMessage } = this.env;
      this.parsedSnsConfig = {
        originationNumber,
        senderId,
        smsMessage,
      };
    }

    return this.parsedSnsConfig;
  }

  /**
   * Gets the SES configuration.
   */
  get sesConfig(): SesServiceConfig {
    if (this.parsedSesConfig === undefined) {
      const { otpFromAddress: fromAddress, emailSubject: envSubject } =
        this.env;
      const emailSubject = envSubject ? envSubject : this.defaultSubject;
      this.parsedSesConfig = {
        fromAddress,
        emailSubject,
      };
    }

    return this.parsedSesConfig;
  }
}
