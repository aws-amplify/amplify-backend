import { OtpConfig, SnsServiceConfig } from '../types.js';

/**
 * Passwordless Configuration.
 */
export class PasswordlessConfig {
  /**
   * Creates a new instance of the PasswordlessConfig class.
   * @param env The environment variables.
   */
  constructor(private env: Record<string, string | undefined>) {}

  private parsedOtpConfig?: OtpConfig;

  private parsedSnsConfig?: SnsServiceConfig;

  /**
   * Gets the OTP configuration.
   */
  get otpConfig(): OtpConfig {
    if (this.parsedOtpConfig === undefined) {
      const { otpLength } = this.env;
      const MIN_OTP_LENGTH = 6;
      const parsed = parseInt(otpLength ?? '0');
      const input = isNaN(parsed) ? 0 : parsed;
      const length = Math.max(input, MIN_OTP_LENGTH);
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
}
