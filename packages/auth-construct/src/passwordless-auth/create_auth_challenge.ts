import { logger } from './logger.js';
import { CreateAuthChallengeTriggerEvent } from './types.js';

/**
 * The Create Auth Challenge lambda handler.
 * @param event The Create Auth Challenge event provided by Cognito.
 * @returns The response, including the public and private challenge params.
 *
 * Reference: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-create-auth-challenge.html
 */
export const createAuthChallenge = async (
  event: CreateAuthChallengeTriggerEvent
) => {
  logger.debug(JSON.stringify(event, null, 2));
  try {
    if (!event.request.session || !event.request.session.length) {
      // This is the first time Create Auth Challenge is called, create a
      // dummy challenge, allowing the user to send a challenge response
      // with client metadata, that can be used to to provide auth parameters.
      logger.info('Client has no session yet, starting one ...');
      await provideAuthParameters(event);
    } else {
      const { signInMethod } = event.request.clientMetadata ?? {};
      logger.info(`Client has requested signInMethod: ${signInMethod}`);
      if (signInMethod === 'MAGIC_LINK') {
        // TODO: Implement
        throw Error('Magic Link not implemented.');
      } else if (signInMethod === 'OTP') {
        // TODO: Implement
        throw Error('OTP not implemented.');
      } else {
        throw new Error(`Unrecognized signInMethod: ${signInMethod}`);
      }
    }
    logger.debug(JSON.stringify(event, null, 2));
    return event;
  } catch (err) {
    logger.error(err);
    throw err;
  }
};

const provideAuthParameters = async (
  event: CreateAuthChallengeTriggerEvent
): Promise<void> => {
  logger.info('Creating challenge: PROVIDE_AUTH_PARAMETERS');
  event.response.challengeMetadata = 'PROVIDE_AUTH_PARAMETERS';
  const parameters: Record<string, string> = {
    challenge: 'PROVIDE_AUTH_PARAMETERS',
  };
  event.response.privateChallengeParameters = parameters;
  event.response.publicChallengeParameters = parameters;
};
