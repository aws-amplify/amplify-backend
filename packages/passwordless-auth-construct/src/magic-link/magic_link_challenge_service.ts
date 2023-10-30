import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { ChallengeService } from '../types.js';

/**
 * Magic Link Challenge Service Implementation.
 */
export class MagicLinkChallengeService implements ChallengeService {
  public readonly signInMethod = 'MAGIC_LINK';
  public createChallenge = async (
    event: CreateAuthChallengeTriggerEvent
  ): Promise<CreateAuthChallengeTriggerEvent> => {
    // TODO: implement Magic Link
    return event;
  };
  public verifyChallenge = async (
    event: VerifyAuthChallengeResponseTriggerEvent
  ): Promise<VerifyAuthChallengeResponseTriggerEvent> => {
    // TODO: implement Magic Link
    return event;
  };
}
