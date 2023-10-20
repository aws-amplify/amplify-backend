import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';

/**
 * A service for creating and verifying challenges, for example OTP or Magic
 * Link challenges.
 */
export abstract class ChallengeService {
  /**
   * Creates the challenge based on the event.
   * @param event - The Create Auth Challenge Event.
   */
  abstract createChallenge(
    event: CreateAuthChallengeTriggerEvent
  ): Promise<CreateAuthChallengeTriggerEvent>;

  /**
   * Verifies the challenge based on the event.
   * @param event - The Verify Auth Challenge Event.
   */
  abstract verifyChallenge(
    event: VerifyAuthChallengeResponseTriggerEvent
  ): Promise<VerifyAuthChallengeResponseTriggerEvent>;
}
