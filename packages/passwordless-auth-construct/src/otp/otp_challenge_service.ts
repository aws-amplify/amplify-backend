import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { ChallengeService } from '../models/challenge_service.js';

/**
 * OTP Challenge Service Implementation.
 */
export class OtpChallengeService implements ChallengeService {
  public createChallenge = async (
    event: CreateAuthChallengeTriggerEvent
  ): Promise<CreateAuthChallengeTriggerEvent> => {
    // TODO: Implement OTP
    return event;
  };
  public verifyChallenge = async (
    event: VerifyAuthChallengeResponseTriggerEvent
  ): Promise<VerifyAuthChallengeResponseTriggerEvent> => {
    // TODO: Implement OTP
    return event;
  };
}
