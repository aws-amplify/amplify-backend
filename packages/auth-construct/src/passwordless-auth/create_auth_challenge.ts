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
  const previousSessions = event.request.session;
  try {
    if (!previousSessions || !previousSessions.length) {
      // If there are no previous sessions, this is the first time CreateAuthChallenge is called.
      // In this scenarios, a dummy challenge is created allowing the client to send a challenge
      // response with client metadata that can be used to to provide auth parameters.
      // This is required because Cognito only passes client metadata to custom auth triggers
      // when the RespondToAuthChallenge API is invoked. Client metadata is not included when the
      // InitiateAuth API is invoked.
      // See: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html#CognitoUserPools-InitiateAuth-request-ClientMetadata
      await provideAuthParameters(event);
    } else {
      const { signInMethod } = event.request.clientMetadata ?? {};
      logger.info(`Client has requested signInMethod: ${signInMethod}`);
      if (signInMethod === 'MAGIC_LINK') {
        // TODO: Implement magic link.
        throw Error('Magic Link not implemented.');
      } else if (signInMethod === 'OTP') {
        // TODO: Implement OTP.
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

/**
 * Adds metadata to the event to indicate that auth parameters need to be supplied.
 * @param event The lambda event.
 */
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
