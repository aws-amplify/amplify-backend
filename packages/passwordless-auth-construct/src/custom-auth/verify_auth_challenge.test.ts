import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { verifyAuthChallenge } from './verify_auth_challenge.js';
import { buildVerifyAuthChallengeResponseEvent } from './event.mocks.js';

void describe('verifyAuthChallenge', () => {
  void it('returns an error if for an unrecognized sign in method', async () => {
    const event = buildVerifyAuthChallengeResponseEvent({
      signInMethod: 'FOO',
    });
    const error = await verifyAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'Unrecognized signInMethod: FOO');
  });

  // TODO: remove when magic link is implemented.
  void it('returns a not implemented exception when invoking magic link', async () => {
    const event = buildVerifyAuthChallengeResponseEvent({
      signInMethod: 'MAGIC_LINK',
    });
    const error = await verifyAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'Magic Link not implemented.');
  });

  // TODO: remove when OTP is implemented.
  void it('returns a not implemented exception when invoking OTP', async () => {
    const event = buildVerifyAuthChallengeResponseEvent({
      signInMethod: 'OTP',
    });
    const error = await verifyAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'OTP not implemented.');
  });
});
