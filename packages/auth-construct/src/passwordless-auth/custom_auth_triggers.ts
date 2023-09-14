import { createAuthChallenge } from './create_auth_challenge.js';
import { defineAuthChallenge } from './define_auth_challenge.js';
import {
  CreateAuthChallengeTriggerEvent,
  CreateAuthChallengeTriggerHandler,
  DefineAuthChallengeTriggerEvent,
  DefineAuthChallengeTriggerHandler,
  VerifyAuthChallengeResponseTriggerEvent,
  VerifyAuthChallengeResponseTriggerHandler,
} from './types.js';
import { verifyAuthChallenge } from './verify_auth_challenge.js';

/**
 * The Define Auth Challenge lambda handler.
 * @param event The Define Auth Challenge event provided by Cognito.
 * @returns The response, including the challenge name.
 *
 * Reference: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-define-auth-challenge.html
 */
export const defineAuthChallengeHandler: DefineAuthChallengeTriggerHandler =
  async (event: DefineAuthChallengeTriggerEvent) => {
    return defineAuthChallenge(event);
  };

/**
 * The Verify Auth Challenge Response lambda handler.
 * @param event The Verify Auth Challenge Response event provided by Cognito.
 * @returns The response, including whether or not the answer was correct.
 *
 * Reference: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-verify-auth-challenge-response.html
 */
export const createAuthChallengeHandler: CreateAuthChallengeTriggerHandler =
  async (event: CreateAuthChallengeTriggerEvent) => {
    return createAuthChallenge(event);
  };

/**
 * The Create Auth Challenge lambda handler.
 * @param event The Create Auth Challenge event provided by Cognito.
 * @returns The response, including the public and private challenge params.
 *
 * Reference: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-create-auth-challenge.html
 */
export const verifyAuthChallengeHandler: VerifyAuthChallengeResponseTriggerHandler =
  async (event: VerifyAuthChallengeResponseTriggerEvent) => {
    return verifyAuthChallenge(event);
  };
