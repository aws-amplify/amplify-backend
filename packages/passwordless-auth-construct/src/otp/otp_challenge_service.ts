import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { ChallengeService } from '../models/challenge_service.js';

/**
 * OTP Challenge Service Implementation.
 */
export class OtpChallengeService implements ChallengeService {
  public createChallenge = (
    event: CreateAuthChallengeTriggerEvent
  ): CreateAuthChallengeTriggerEvent => {
    // TODO: Implement OTP
    return event;
  };
  public verifyChallenge = (
    event: VerifyAuthChallengeResponseTriggerEvent
  ): VerifyAuthChallengeResponseTriggerEvent => {
    // TODO: Implement OTP
    return event;
  };
}
