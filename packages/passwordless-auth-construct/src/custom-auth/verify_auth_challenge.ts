import { VerifyAuthChallengeResponseTriggerEvent } from 'aws-lambda';
import { logger } from '../logger.js';

/**
 * The Verify Auth Challenge Response lambda handler.
 * @param event - The Verify Auth Challenge Response event provided by Cognito.
 * @returns the response, including whether or not the answer was correct.
 *
 * Reference: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-verify-auth-challenge-response.html
 */
export const verifyAuthChallenge = async (
  event: VerifyAuthChallengeResponseTriggerEvent
): Promise<VerifyAuthChallengeResponseTriggerEvent> => {
  logger.debug(JSON.stringify(event, null, 2));
  try {
    event.response.answerCorrect = false;
    const signInMethod = event.request.clientMetadata?.signInMethod;
    if (signInMethod === 'MAGIC_LINK') {
      // TODO: Implement magic link.
      throw Error('Magic Link not implemented.');
    } else if (signInMethod === 'OTP') {
      // TODO: Implement OTP.
      throw Error('OTP not implemented.');
    } else {
      throw new Error(`Unrecognized signInMethod: ${signInMethod ?? 'NULL'}`);
    }
  } catch (err) {
    logger.error(err);
    throw err;
  }
};
