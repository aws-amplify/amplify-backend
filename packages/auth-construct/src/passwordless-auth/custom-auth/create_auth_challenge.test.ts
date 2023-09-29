import { notEqual, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';
import { createAuthChallenge } from './create_auth_challenge.js';
import {
  buildCreateAuthChallengeEvent,
  initialSession,
  requestMagicLinkMetaData,
  requestOtpSmsMetaData,
} from './event_mocks.js';

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
    // eslint @typescript-eslint/no-explicit-any
    const event = buildCreateAuthChallengeEvent([initialSession], {
      signInMethod: 'FOO',
    } as any);
    const error = await createAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'Unrecognized signInMethod: FOO');
  });

  // TODO: remove when magic link is implemented.
  void it('returns a not implemented exception when invoking magic link', async () => {
    const event = buildCreateAuthChallengeEvent(
      [initialSession],
      requestMagicLinkMetaData
    );
    const error = await createAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'Magic Link not implemented.');
  });

  void describe('signInMethod: OTP', () => {
    void describe('deliveryMedium: SMS ', () => {
      void it('returns correct parameters', async () => {
        const event = buildCreateAuthChallengeEvent(
          [initialSession],
          requestOtpSmsMetaData
        );

        const result = await createAuthChallenge(event);

        strictEqual(
          result.response.publicChallengeParameters.destination,
          '+*******5555'
        );
        strictEqual(
          result.response.publicChallengeParameters.deliveryMedium,
          'SMS'
        );
        notEqual(result.response.privateChallengeParameters.otpCode, null);
      });
    });
  });
});
