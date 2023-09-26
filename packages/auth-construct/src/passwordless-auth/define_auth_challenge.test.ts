import { describe, it } from 'node:test';
import {
  ChallengeResult,
  CustomChallengeResult,
  DefineAuthChallengeTriggerEvent,
} from './types.js';
import { strictEqual } from 'node:assert';
import { defineAuthChallenge } from './define_auth_challenge.js';

// A challenge session from Device SRP sign in.
const srpSession: ChallengeResult = {
  challengeName: 'DEVICE_SRP_AUTH',
  challengeResult: false,
};

/**
 * Creates a mock lambda event for testing.
 * @param previousSessions The array of sessions from previous challenges
 * @returns A lambda trigger event for Define Auth Challenge.
 */
const buildEvent = (
  previousSessions?: Array<ChallengeResult | CustomChallengeResult>
): DefineAuthChallengeTriggerEvent => {
  return {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'us-east-1_ABCD12345',
    userName: 'abcd1234-1234-1234-1234-abcd12345678',
    callerContext: {
      awsSdkVersion: 'aws-sdk-unknown-unknown',
      clientId: 'abcd12345678',
    },
    triggerSource: 'DefineAuthChallenge_Authentication',
    request: {
      userAttributes: {
        sub: 'abcd1234-1234-1234-1234-abcd12345678',
        email_verified: 'true',
        email: 'foo@example.com',
      },
      session: previousSessions ?? [],
      userNotFound: false,
    },
    response: {},
  };
};

describe('defineAuthChallenge', () => {
  it('returns CUSTOM_CHALLENGE if no session currently exists', async () => {
    const event = buildEvent();
    const updatedEvent = await defineAuthChallenge(event);
    strictEqual(updatedEvent.response.challengeName, 'CUSTOM_CHALLENGE');
    strictEqual(updatedEvent.response.failAuthentication, false);
  });

  it('fails authentication if any previous sessions were not a custom challenge', async () => {
    const event = buildEvent([srpSession]);
    const updatedEvent = await defineAuthChallenge(event);
    strictEqual(updatedEvent.response.failAuthentication, true);
  });
});
