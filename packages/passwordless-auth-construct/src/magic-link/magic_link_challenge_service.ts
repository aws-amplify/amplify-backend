import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { ChallengeService } from '../models/challenge_service.js';

/**
 * Magic Link Challenge Service Implementation.
 */
export class MagicLinkChallengeService implements ChallengeService {
  public createChallenge = (
    event: CreateAuthChallengeTriggerEvent
  ): CreateAuthChallengeTriggerEvent => {
    // TODO: implement Magic Link
    return event;
  };
  public verifyChallenge = (
    event: VerifyAuthChallengeResponseTriggerEvent
  ): VerifyAuthChallengeResponseTriggerEvent => {
    // TODO: implement Magic Link
    return event;
  };
}
