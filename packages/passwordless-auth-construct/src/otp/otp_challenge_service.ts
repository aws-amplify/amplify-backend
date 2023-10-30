import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { ChallengeService } from '../types.js';

/**
 * OTP Challenge Service Implementation.
 */
export class OtpChallengeService implements ChallengeService {
  public readonly signInMethod = 'OTP';
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
