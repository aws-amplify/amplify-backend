import { logger } from './logger.js';
import { VerifyAuthChallengeResponseTriggerEvent } from './types.js';

/**
 * The Verify Auth Challenge Response lambda handler.
 * @param event The Verify Auth Challenge Response event provided by Cognito.
 * @returns The response, including whether or not the answer was correct.
 *
 * Reference: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-verify-auth-challenge-response.html
 */
export const verifyAuthChallenge = async (
  event: VerifyAuthChallengeResponseTriggerEvent
) => {
  logger.debug(JSON.stringify(event, null, 2));
  try {
    event.response.answerCorrect = false;
    const signInMethod = event.request.clientMetadata?.signInMethod;

    // Verify challenge answer
    if (signInMethod === 'MAGIC_LINK') {
      // TODO: Implement
      throw Error('Magic Link not implemented.');
    } else if (signInMethod === 'OTP') {
      // TODO: Implement
      throw Error('OTP not implemented.');
    }

    // Return event
    logger.debug(JSON.stringify(event, null, 2));
    logger.debug(
      'Verification result, answerCorrect:',
      event.response.answerCorrect
    );
    return event;
  } catch (err) {
    logger.error(err);
    throw err;
  }
};
