import { describe, it } from 'node:test';
import {
  PasswordlessClientMetaData,
  StringMap,
  VerifyAuthChallengeResponseTriggerEvent,
} from './types.js';
import { strictEqual } from 'node:assert';
import { verifyAuthChallenge } from './verify_auth_challenge.js';

/**
 * Creates a mock lambda event for testing.
 * @param clientMetadata The client metadata included in the request from the client.
 * @returns A lambda trigger event for Create Auth Challenge.
 */
const buildEvent = (
  clientMetadata?: PasswordlessClientMetaData | StringMap
): VerifyAuthChallengeResponseTriggerEvent => {
  return {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'us-east-1_ABCD12345',
    userName: 'abcd1234-1234-1234-1234-abcd12345678',
    callerContext: {
      awsSdkVersion: 'aws-sdk-unknown-unknown',
      clientId: 'abcd12345678',
    },
    triggerSource: 'VerifyAuthChallengeResponse_Authentication',
    request: {
      userAttributes: {
        sub: 'abcd1234-1234-1234-1234-abcd12345678',
        email_verified: 'true',
        email: 'foo@example.com',
      },
      privateChallengeParameters: {},
      challengeAnswer: 'answer',
      clientMetadata: clientMetadata,
      userNotFound: false,
    },
    response: {},
  };
};

describe('verifyAuthChallenge', () => {
  it('returns an error if for an unrecognized sign in method', async () => {
    const event = buildEvent({ signInMethod: 'FOO' });
    const error = await verifyAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'Unrecognized signInMethod: FOO');
  });

  // TODO: remove when magic link is implemented.
  it('returns a not implemented exception when invoking magic link', async () => {
    const event = buildEvent({ signInMethod: 'MAGIC_LINK' });
    const error = await verifyAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'Magic Link not implemented.');
  });

  // TODO: remove when OTP is implemented.
  it('returns a not implemented exception when invoking OTP', async () => {
    const event = buildEvent({ signInMethod: 'OTP' });
    const error = await verifyAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'OTP not implemented.');
  });
});
