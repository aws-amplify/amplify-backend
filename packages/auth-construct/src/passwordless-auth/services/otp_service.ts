import { randomInt } from 'crypto';
import {
  CreateAuthChallengeTriggerEvent,
  RequestOTPClientMetaData,
} from '../custom-auth/types.js';

/**
 * OTP Service Implementation.
 * Contains destination agnostic methods for OTP
 */
export class OtpService {
  /**
   * Generate OTP code
   * @returns randomly OTP code
   */
  public generateOtpCode = (): string => {
    const DEFAULT_OTP_LENGTH = 6;
    const otpLengthEnv = parseInt(process.env.otpLength ?? '0');

    // code must be 6 or greater
    const length =
      otpLengthEnv > DEFAULT_OTP_LENGTH ? otpLengthEnv : DEFAULT_OTP_LENGTH;

    return [...new Array<unknown>(length)].map(() => randomInt(0, 9)).join('');
  };

  /**
   * Validate OTP request
   * @param event - The Create Auth Challenge event provided by Cognito.
   * @returns true if valid else throws error
   */
  public validate = (event: CreateAuthChallengeTriggerEvent): boolean => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { phone_number_verified } = event.request.userAttributes ?? {};
    const { deliveryMedium } =
      (event.request.clientMetadata as RequestOTPClientMetaData) ?? {};
    // TODO: Handle error responses & prevent user existence

    // 1. If user does not exist send generic message
    if (event.request.userNotFound) {
      throw Error('User not found');
    }

    // 2. Validate phone number is verified
    if (!phone_number_verified || phone_number_verified !== 'true') {
      throw Error('Phone number not verified');
    }

    // 3. Validate deliveryMedium
    if (deliveryMedium !== 'SMS' && deliveryMedium !== 'EMAIL') {
      throw Error('Invalid destination medium');
    }

    return true;
  };

  /**
   * Create SMS content
   * @param secretCode The OTP code
   * @returns The SMS content
   */
  public createSmsMessage = (secretCode: string): string => {
    return `Your verification code is: ${secretCode}`;
  };
}
