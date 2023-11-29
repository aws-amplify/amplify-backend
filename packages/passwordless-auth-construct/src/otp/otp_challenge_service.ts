import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { randomInt } from 'crypto';
import { DeliveryServiceFactory } from '../factories/delivery_service_factory.js';
import { logger } from '../logger.js';

import { ChallengeService, OtpConfig } from '../types.js';
import { validateDeliveryCodeDetails } from '../common/validate_delivery_code_details.js';

/**
 * OTP Challenge Service Implementation.
 */
export class OtpChallengeService implements ChallengeService {
  /**
   * OTP Challenge constructor
   * @param deliveryServiceFactory - Determines which delivery service to use for OTP.
   * @param config - OTP Challenge configuration
   */
  constructor(
    private deliveryServiceFactory: DeliveryServiceFactory,
    private config: OtpConfig
  ) {}
  public readonly signInMethod = 'OTP';

  /**
   * Create OTP challenge
   * Steps:
   * 1. Validate Request
   * 2. Generate OTP code
   * 3. Send OTP Message
   * 4. Update event response with OTP code & deliver details
   *  - privateChallengeParameters: otpCode
   *  - publicChallengeParameters: destination & deliveryMedium
   * @param event - The Create Auth Challenge event provided by Cognito.
   * @returns CreateAuthChallengeTriggerEvent with OTP code & delivery details
   */
  public createChallenge = async (
    deliveryDetails: CodeDeliveryDetails,
    destination: string,
    event: CreateAuthChallengeTriggerEvent
  ): Promise<CreateAuthChallengeTriggerEvent> => {
    const { deliveryMedium, destination } = validateDeliveryCodeDetails(event);

    const otpCode = this.generateOtpCode();

    const deliveryService =
      this.deliveryServiceFactory.getService(deliveryMedium);
    await deliveryService.send(otpCode, destination, this.signInMethod);

    const response: CreateAuthChallengeTriggerEvent = {
      ...event,
      response: {
        ...event.response,
        privateChallengeParameters: {
          ...event.response.privateChallengeParameters,
          otpCode: otpCode,
        },
        publicChallengeParameters: {
          ...event.response.publicChallengeParameters,
          destination: deliveryService.mask(destination),
          deliveryMedium: deliveryMedium,
        },
      },
    };

    logger.debug(JSON.stringify(response, null, 2));
    return response;
  };

  /**
   * Verify OTP challenge answer
   *
   * Steps:
   * 1. Validate Request
   * 2. Compare challenge answers
   * 3. Return response with answerCorrect, if true then credentials will be issued
   * @param event - The Verify Auth Challenge event provided by Cognito.
   * @returns VerifyAuthChallengeResponseTriggerEvent with answerCorrect
   */
  public verifyChallenge = async (
    event: VerifyAuthChallengeResponseTriggerEvent
  ): Promise<VerifyAuthChallengeResponseTriggerEvent> => {
    const { answer } = this.validateVerifyEvent(event);

    const response: VerifyAuthChallengeResponseTriggerEvent = {
      ...event,
      response: {
        ...event.response,
        answerCorrect: answer,
      },
    };

    logger.debug(JSON.stringify(response, null, 2));
    return response;
  };

  /**
   * Generate OTP code
   * @returns randomly generated OTP code
   */
  protected generateOtpCode(): string {
    return [...new Array<unknown>(this.config.otpLength)]
      .map(() => randomInt(0, 9))
      .join('');
  }

  /**
   * Validate OTP confirm event
   * @param event - The Verify Auth Challenge event provided by Cognito.
   * @returns otpCode & answer if valid else throws error
   */
  private validateVerifyEvent = (
    event: VerifyAuthChallengeResponseTriggerEvent
  ): { answer: boolean } => {
    const { otpCode } = event.request.privateChallengeParameters;
    const challengeAnswer = event.request.challengeAnswer;

    // Verify OTP code was saved in the last request
    if (!otpCode) {
      throw Error('OTP code not found in privateChallengeParameters');
    }

    return { answer: otpCode === challengeAnswer };
  };
}
