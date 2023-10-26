import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { ChallengeService } from '../types.js';

/**
 * A mock challenge service.
 */
export class MockChallengeService implements ChallengeService {
  public readonly signInMethod = 'OTP';
  createChallenge = async (
    event: CreateAuthChallengeTriggerEvent
  ): Promise<CreateAuthChallengeTriggerEvent> => {
    return {
      ...event,
      response: {
        ...event.response,
        publicChallengeParameters: {
          deliveryMedium: 'EMAIL',
          destination: 'foo@example.com',
        },
        privateChallengeParameters: {
          code: 'correct-answer',
        },
      },
    };
  };

  verifyChallenge = async (
    event: VerifyAuthChallengeResponseTriggerEvent
  ): Promise<VerifyAuthChallengeResponseTriggerEvent> => {
    return {
      ...event,
      response: {
        ...event.response,
        answerCorrect:
          event.request.challengeAnswer ===
          event.request.privateChallengeParameters.code,
      },
    };
  };
}
