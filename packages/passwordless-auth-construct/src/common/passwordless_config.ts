import { Duration } from 'aws-cdk-lib';
import {
  MagicLinkConfig,
  OtpConfig,
  SesServiceConfig,
  SnsServiceConfig,
} from '../types.js';

const minOtpLength = 6;
const defaultMagicLinkExpiry = 60 * 15; // 15 minutes
const maxMagicLinkExpiry = 60 * 60; // 1 hour
const defaultOtpSubject = 'Your verification code';
const defaultOtpBody = 'Your verification code is: ####';
const defaultMagicLinkSubject = 'Your sign-in link';
const defaultMagicLinkBody =
  '<html><body><p>Your sign-in link: <a href="####">sign in</a></p></body></html>';

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

  private parsedMagicLinkConfig?: MagicLinkConfig;

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
      const length = Math.max(input, minOtpLength);
      this.parsedOtpConfig = {
        otpLength: length,
      };
    }

    return this.parsedOtpConfig;
  }

  /**
   * Gets the Magic Link configuration.
   */
  get magicLinkConfig(): MagicLinkConfig {
    if (this.parsedMagicLinkConfig === undefined) {
      const {
        magicLinkSecondsUntilExpiry,
        magicLinkAllowedOrigins,
        magicLinkKmsKeyId,
        magicLinkTableName,
      } = this.env;

      const secondsUntilExpiry = magicLinkSecondsUntilExpiry
        ? Math.min(maxMagicLinkExpiry, Number(magicLinkSecondsUntilExpiry))
        : defaultMagicLinkExpiry;

      this.parsedMagicLinkConfig = {
        linkDuration: Duration.seconds(secondsUntilExpiry),
        allowedOrigins: magicLinkAllowedOrigins
          ? magicLinkAllowedOrigins
              .split(',')
              .map((href) => new URL(href))
              .map((url) => url.origin)
          : [],
        kms: {
          keyId: magicLinkKmsKeyId,
        },
        storage: {
          tableName: magicLinkTableName,
        },
      };
    }
    return this.parsedMagicLinkConfig;
  }

  /**
   * Gets the SNS configuration.
   */
  get snsConfig(): SnsServiceConfig {
    if (this.parsedSnsConfig === undefined) {
      const {
        otpOriginationNumber,
        otpSenderId,
        magicLinkOriginationNumber,
        magicLinkSenderId,
      } = this.env;
      this.parsedSnsConfig = {
        otp: {
          originationNumber: otpOriginationNumber,
          senderId: otpSenderId,
        },
        magicLink: {
          originationNumber: magicLinkOriginationNumber,
          senderId: magicLinkSenderId,
        },
      };
    }

    return this.parsedSnsConfig;
  }

  /**
   * Gets the SES configuration.
   */
  get sesConfig(): SesServiceConfig {
    if (this.parsedSesConfig === undefined) {
      const {
        otpFromAddress,
        otpSubject,
        otpBody,
        magicLinkFromAddress,
        magicLinkSubject,
        magicLinkBody,
      } = this.env;
      this.parsedSesConfig = {
        otp: {
          fromAddress: otpFromAddress,
          subject: otpSubject || defaultOtpSubject,
          body: otpBody || defaultOtpBody,
        },
        magicLink: {
          fromAddress: magicLinkFromAddress,
          subject: magicLinkSubject || defaultMagicLinkSubject,
          body: magicLinkBody || defaultMagicLinkBody,
        },
      };
    }
    return this.parsedSesConfig;
  }
}
