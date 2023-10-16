import { describe, it } from 'node:test';
import { createAuthChallenge } from './create_auth_challenge.js';
import { strictEqual } from 'node:assert';
import { buildCreateAuthChallengeEvent } from './event.mocks.js';
import { ChallengeResult } from '../types.js';

// The custom auth session from the initial Cognito InitiateAuth call.
const initialSession: ChallengeResult = {
  challengeName: 'CUSTOM_CHALLENGE',
  challengeResult: false,
  challengeMetadata: 'PROVIDE_AUTH_PARAMETERS',
};

void describe('createAuthChallenge', () => {
  void it('returns PROVIDE_AUTH_PARAMETERS if auth params have not yet been provided', async () => {
    const event = buildCreateAuthChallengeEvent();
    const updatedEvent = await createAuthChallenge(event);
    strictEqual(
      updatedEvent.response.challengeMetadata,
      'PROVIDE_AUTH_PARAMETERS'
    );
  });

  void it('returns an error for an unrecognized sign in method', async () => {
    const event = buildCreateAuthChallengeEvent([initialSession], {
      signInMethod: 'FOO',
    });
    const error = await createAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'Unrecognized signInMethod: FOO');
  });

  // TODO: remove when magic link is implemented.
  void it('returns a not implemented exception when invoking magic link', async () => {
    const event = buildCreateAuthChallengeEvent([initialSession], {
      signInMethod: 'MAGIC_LINK',
    });
    const error = await createAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'Magic Link not implemented.');
  });

  // TODO: remove when OTP is implemented.
  void it('returns a not implemented exception when invoking OTP', async () => {
    const event = buildCreateAuthChallengeEvent([initialSession], {
      signInMethod: 'OTP',
    });
    const error = await createAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'OTP not implemented.');
  });
});
