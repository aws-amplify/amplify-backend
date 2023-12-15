import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { randomInt } from 'crypto';
import { DeliveryServiceFactory } from '../factories/delivery_service_factory.js';
import { logger } from '../logger.js';

import {
  ChallengeService,
  CodeDeliveryDetails,
  OtpConfig,
  PasswordlessErrorCodes,
} from '../types.js';
import { StringMap } from 'aws-lambda/trigger/cognito-user-pool-trigger/_common.js';

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
  public readonly maxAttempts = 3;

  /**
   * Create OTP challenge
   * Steps:
   * 1. Generate OTP code
   *   1a. If previous OTP code exists, use that instead
   * 2. Send OTP Message
   * 3. Return new event response with OTP code & delivery details
   * @param deliveryDetails - The validated deliveryDetails for this challenge.
   * @param destination - The validated destination for this challenge.
   * @param event - The Create Auth Challenge event provided by Cognito.
   * @returns CreateAuthChallengeTriggerEvent with OTP code & delivery details
   */
  public createChallenge = async (
    deliveryDetails: CodeDeliveryDetails,
    destination: string,
    event: CreateAuthChallengeTriggerEvent
  ): Promise<CreateAuthChallengeTriggerEvent> => {
    const otpCodeMetaDataKey = 'OTP_CODE';
    const previousChallenge = event.request.session.slice(-1)[0];
    const previousSecretCode: string | undefined =
      previousChallenge.challengeMetadata?.includes(otpCodeMetaDataKey)
        ? JSON.parse(previousChallenge.challengeMetadata)[otpCodeMetaDataKey]
        : undefined;

    const otpCode = previousSecretCode ?? this.generateOtpCode();

    const { deliveryMedium } = deliveryDetails;

    if (!previousSecretCode) {
      logger.debug(`Sending OTP code...`);
      await this.deliveryServiceFactory
        .getService(deliveryMedium)
        .send(otpCode, destination, this.signInMethod);
    }

    const challengeMetadata = JSON.stringify({
      [otpCodeMetaDataKey]: otpCode,
      deliveryMedium: deliveryMedium,
    });

    let publicChallengeParameters: StringMap = {
      nextStep: 'PROVIDE_CHALLENGE_RESPONSE',
      ...event.response.publicChallengeParameters,
      ...deliveryDetails,
    };

    // If previous OTP code exists, then this is a retry
    // Add error code to publicChallengeParameters
    if (previousSecretCode) {
      logger.debug(`Using previous OTP code...`);
      publicChallengeParameters = {
        ...publicChallengeParameters,
        errorCode: PasswordlessErrorCodes.CODE_MISMATCH_EXCEPTION,
      };
    }

    const response: CreateAuthChallengeTriggerEvent = {
      ...event,
      response: {
        ...event.response,
        challengeMetadata: challengeMetadata,
        privateChallengeParameters: {
          ...event.response.privateChallengeParameters,
          otpCode: otpCode,
        },
        publicChallengeParameters: publicChallengeParameters,
      },
    };

    logger.debug(
      `create challenge response: ${JSON.stringify(response, null, 2)}`
    );
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

    logger.debug(
      `verify challenge response: ${JSON.stringify(response, null, 2)}`
    );
    return response;
  };

  /**
   * Generate OTP code
   * @returns randomly generated OTP code
   */
  private generateOtpCode(): string {
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
