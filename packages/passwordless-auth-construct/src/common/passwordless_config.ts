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

  /**
   * Gets the OTP configuration.
   */
  get otpConfig(): OtpConfig {
    const { otpLength } = this.env;
    const MIN_OTP_LENGTH = 6;
    const parsed = parseInt(otpLength ?? '0');
    const input = isNaN(parsed) ? 0 : parsed;
    const length = Math.max(input, MIN_OTP_LENGTH);

    return {
      otpLength: length,
    };
  }

  /**
   * Gets the SNS configuration.
   */
  get snsConfig(): SnsServiceConfig {
    const { originationNumber, senderId } = this.env;
    return {
      originationNumber,
      senderId,
    };
  }
}
