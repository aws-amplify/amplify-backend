import { logger } from './logger.js';
import { DefineAuthChallengeTriggerEvent } from './types.js';

/**
 * The Define Auth Challenge lambda handler.
 * @param event The Define Auth Challenge event provided by Cognito.
 * @returns The response, including the challenge name.
 *
 * Reference: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-define-auth-challenge.html
 */
export const defineAuthChallenge = async (
  event: DefineAuthChallengeTriggerEvent
) => {
  logger.debug(JSON.stringify(event, null, 2));

  if (!event.request.session.length) {
    logger.info('No session yet, starting one ...');
    return customChallenge(event);
  }

  const isCustomChallenge = event.request.session.find(
    (attempt) => attempt.challengeName !== 'CUSTOM_CHALLENGE'
  );

  if (isCustomChallenge) {
    return deny(event, 'Expected CUSTOM_CHALLENGE');
  }

  const { signInMethod } = event.request.clientMetadata ?? {};
  logger.info(`Requested signInMethod: ${signInMethod}`);

  if (signInMethod === 'MAGIC_LINK') {
    // TODO: Implement
    return deny(event, 'Magic Link is not yet implemented.');
  } else if (signInMethod === 'OTP') {
    // TODO: Implement
    return deny(event, 'OTP is not yet implemented.');
  }

  return deny(event, `Unrecognized signInMethod: ${signInMethod}`);
};

const deny = (event: DefineAuthChallengeTriggerEvent, reason: string) => {
  logger.info('Failing authentication because:', reason);
  event.response.issueTokens = false;
  event.response.failAuthentication = true;
  logger.debug(JSON.stringify(event, null, 2));
  return event;
};

const customChallenge = (event: DefineAuthChallengeTriggerEvent) => {
  event.response.issueTokens = false;
  event.response.failAuthentication = false;
  event.response.challengeName = 'CUSTOM_CHALLENGE';
  logger.info('Next step: CUSTOM_CHALLENGE');
  logger.debug(JSON.stringify(event, null, 2));
  return event;
};
