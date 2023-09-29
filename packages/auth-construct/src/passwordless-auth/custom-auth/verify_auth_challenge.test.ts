import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildVerifyAuthChallengeEvent,
  confirmOtpMetaData,
} from './event_mocks.js';
import { verifyAuthChallenge } from './verify_auth_challenge.js';

void describe('verifyAuthChallenge', () => {
  void it('returns an error if for an unrecognized sign in method', async () => {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const event = buildVerifyAuthChallengeEvent({
      signInMethod: 'FOO',
      action: 'CONFIRM',
    } as any);
    const error = await verifyAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'Unrecognized signInMethod: FOO');
  });

  // TODO: remove when magic link is implemented.
  void it('returns a not implemented exception when invoking magic link', async () => {
    const event = buildVerifyAuthChallengeEvent({
      signInMethod: 'MAGIC_LINK',
      action: 'CONFIRM',
    });
    const error = await verifyAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'Magic Link not implemented.');
  });

  void describe('signInMethod: OTP', () => {
    void it('should return answerCorrect: true when correct OTP code is provided', async () => {
      const event = buildVerifyAuthChallengeEvent(confirmOtpMetaData);
      event.request.challengeAnswer = '123456';
      event.request.privateChallengeParameters.otpCode = '123456';
      const result = await verifyAuthChallenge(event);
      strictEqual(result.response.answerCorrect, true);
    });

    void it('should return answerCorrect: false when wrong OTP code is provided', async () => {
      const event = buildVerifyAuthChallengeEvent(confirmOtpMetaData);
      event.request.challengeAnswer = '098765';
      event.request.privateChallengeParameters.otpCode = '123456';
      const result = await verifyAuthChallenge(event);
      strictEqual(result.response.answerCorrect, false);
    });
  });
});
