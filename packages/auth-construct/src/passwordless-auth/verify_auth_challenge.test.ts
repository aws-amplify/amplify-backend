import { describe, it } from 'node:test';
import {
  PasswordlessClientMetaData,
  StringMap,
  VerifyAuthChallengeResponseTriggerEvent,
} from './types.js';
import { strictEqual } from 'node:assert';
import { verifyAuthChallenge } from './verify_auth_challenge.js';

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

describe('defineAuthChallenge', () => {
  it('returns an error if for an unrecognized sign in method', async () => {
    const event = buildEvent({ signInMethod: 'FOO' });
    const error = await verifyAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'Unrecognized signInMethod: FOO');
  });
});
