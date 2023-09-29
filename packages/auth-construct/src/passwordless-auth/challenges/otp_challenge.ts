import {
  CreateAuthChallengeTriggerEvent,
  DefineAuthChallengeTriggerEvent,
  RequestOTPClientMetaData,
  VerifyAuthChallengeResponseTriggerEvent,
} from '../custom-auth/types.js';
import { logger } from '../logger.js';
import { OtpService } from '../services/otp_service.js';
import { SnsService } from '../services/sns_service.js';
import { DeliveryService } from '../services/types.js';

/**
 * OTP Challenge Service Implementation.
 * Contains create, define, and verify methods for OTP Challenge
 */
export class OtpChallenge {
  /**
   * OTP Challenge constructor
   * Defines the OTP Service and SMS Service
   * @param otpService - The OTP Service
   * @param smsService - The SMS Service
   */
  protected constructor(
    private otpService: OtpService = new OtpService(),
    private smsService: DeliveryService = new SnsService()
  ) {}

  private static _instance: OtpChallenge;

  /**
   * OTP Challenge singleton instance
   */
  public static get instance() {
    return this._instance || (this._instance = new this());
  }

  /**
   * OTP Challenge - Generate OTP and send via SMS or Email.
   * @param event The Create Auth Challenge event provided by Cognito.
   * @returns The event response, including the public and private challenge params.
   * Overview:
   * 1. Check for verified attribute, ie email or phone is verified. Fail if not verified.
   * 2. Generate OTP & save to privateChallengeParameters
   * 3. Sent OTP via SNS or SES
   * 4. Return response with the following:
   * - publicChallengeParameters: destination, deliveryMedium
   * - privateChallengeParameters: otpCode
   */
  public createChallenge = async (
    event: CreateAuthChallengeTriggerEvent
  ): Promise<CreateAuthChallengeTriggerEvent> => {
    const region = event.region;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { email, phone_number } = event.request.userAttributes ?? {};
    const { deliveryMedium, action } =
      (event.request.clientMetadata as RequestOTPClientMetaData) ?? {};

    // 0. Only run on REQUEST
    if (action !== 'REQUEST') {
      return event;
    }

    // 1. Validate Request
    // TODO: Handle error responses & prevent user existence
    // Errors will be more graceful than throwing an error
    this.otpService.validate(event);

    // 2. Generate OTP & save to privateChallengeParameters
    const otpCode = this.otpService.generateOtpCode();
    event.response.privateChallengeParameters = {
      ...event.response.privateChallengeParameters,
      otpCode: otpCode,
    };

    // 3. Send OTP via SNS or SES
    if (deliveryMedium === 'SMS') {
      const message = this.otpService.createSmsMessage(otpCode);
      await this.smsService.send(message, phone_number, region);
    }
    if (deliveryMedium === 'EMAIL') {
      // TODO: send email via SES
      throw Error('Email not implemented');
    }

    // return success event
    event.response.publicChallengeParameters = {
      ...event.response.publicChallengeParameters,
      destination:
        deliveryMedium === 'SMS' ? this.smsService.mask(phone_number) : email,
      deliveryMedium: deliveryMedium,
    };

    logger.debug(JSON.stringify(event, null, 2));
    return event;
  };

  /**
   * Define OTP Challenge - Define the challenge to be sent to the user.
   * @param event The Define Auth Challenge event provided by Cognito.
   */
  public defineChallenge = (
    event: DefineAuthChallengeTriggerEvent
  ): DefineAuthChallengeTriggerEvent => {
    const { action } = event.request.clientMetadata ?? {};

    if (action !== 'CONFIRM') {
      return event;
    }

    const previousChallenge = event.request.session.slice(-1)[0];

    const challengeAnswer = previousChallenge.challengeResult;

    event.response.issueTokens = challengeAnswer;

    return event;
  };

  /**
   * Verify OTP Challenge - Verify OTP code is correct & vend access token.
   * @param event The Verify Auth Challenge Response event provided by Cognito.
   * @returns - The response, including whether or not the answer was correct.
   */
  public verifyChallenge = (
    event: VerifyAuthChallengeResponseTriggerEvent
  ): VerifyAuthChallengeResponseTriggerEvent => {
    const { action } = event.request.clientMetadata ?? {};
    const { otpCode } = event.request.privateChallengeParameters ?? {};
    const challengeAnswer = event.request.challengeAnswer;

    // 0. Only run on CONFIRM
    if (action !== 'CONFIRM') {
      return event;
    }

    // 1. Verify challenge answer & vend credentials
    event.response.answerCorrect = otpCode === challengeAnswer;

    return event;
  };
}
