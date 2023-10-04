import { logger } from '../logger.js';
import { DefineAuthChallengeTriggerEvent } from '../types.js';

/**
 * The Define Auth Challenge lambda handler.
 * @param event - The Define Auth Challenge event provided by Cognito.
 * @returns the response, including the challenge name.
 *
 * Reference: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-define-auth-challenge.html
 */
export const defineAuthChallenge = async (
  event: DefineAuthChallengeTriggerEvent
): Promise<DefineAuthChallengeTriggerEvent> => {
  logger.debug(JSON.stringify(event, null, 2));

  const previousSessions = event.request.session;
  if (!previousSessions || !previousSessions.length) {
    return customChallenge(event);
  }

  const onlyContainsCustomChallenges = previousSessions.every(
    (attempt) => attempt.challengeName !== 'CUSTOM_CHALLENGE'
  );

  if (!onlyContainsCustomChallenges) {
    return failAuthentication(event, 'Expected CUSTOM_CHALLENGE');
  }

  const { signInMethod } = event.request.clientMetadata ?? {};
  logger.info(`Requested signInMethod: ${signInMethod}`);

  if (signInMethod === 'MAGIC_LINK') {
    // TODO: Implement magic link.
    return failAuthentication(event, 'Magic Link is not yet implemented.');
  } else if (signInMethod === 'OTP') {
    // TODO: Implement OTP.
    return failAuthentication(event, 'OTP is not yet implemented.');
  }

  return failAuthentication(
    event,
    `Unrecognized signInMethod: ${signInMethod}`
  );
};

/**
 * Updates the event to fail authentication and returns it.
 * @param event - The lambda event.
 * @param reason - The reason that authentication has failed.
 * @returns the updated event.
 */
const failAuthentication = (
  event: DefineAuthChallengeTriggerEvent,
  reason: string
) => {
  logger.info('Failing authentication because:', reason);
  event.response.issueTokens = false;
  event.response.failAuthentication = true;
  logger.debug(JSON.stringify(event, null, 2));
  return event;
};

/**
 * Updates the event with the name `CUSTOM_CHALLENGE` and returns it.
 * @param event - The lambda event.
 * @returns the updated event.
 */
const customChallenge = (event: DefineAuthChallengeTriggerEvent) => {
  logger.info('No session yet, starting one ...');
  event.response.issueTokens = false;
  event.response.failAuthentication = false;
  event.response.challengeName = 'CUSTOM_CHALLENGE';
  logger.info('Next step: CUSTOM_CHALLENGE');
  logger.debug(JSON.stringify(event, null, 2));
  return event;
};
