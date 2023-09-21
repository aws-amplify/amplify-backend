import { describe, it } from 'node:test';
import { createAuthChallenge } from './create_auth_challenge.js';
import {
  ChallengeResult,
  CreateAuthChallengeTriggerEvent,
  CustomChallengeResult,
  PasswordlessClientMetaData,
  StringMap,
} from './types.js';
import { strictEqual } from 'node:assert';

const initialSession: CustomChallengeResult = {
  challengeName: 'CUSTOM_CHALLENGE',
  challengeResult: false,
  challengeMetadata: 'PROVIDE_AUTH_PARAMETERS',
};

const requestMagicLinkMetaData: PasswordlessClientMetaData = {
  signInMethod: 'MAGIC_LINK',
  action: 'REQUEST',
  deliveryMedium: 'EMAIL',
  redirectUri: 'https://example.com/sign-in-link/##code##',
};

const requestOTPMetaData: PasswordlessClientMetaData = {
  signInMethod: 'OTP',
  action: 'REQUEST',
  deliveryMedium: 'EMAIL',
};

const buildEvent = (
  previousSessions?: Array<ChallengeResult | CustomChallengeResult>,
  clientMetadata?: PasswordlessClientMetaData | StringMap
): CreateAuthChallengeTriggerEvent => {
  return {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'us-east-1_ABCD12345',
    userName: 'abcd1234-1234-1234-1234-abcd12345678',
    callerContext: {
      awsSdkVersion: 'aws-sdk-unknown-unknown',
      clientId: 'abcd12345678',
    },
    triggerSource: 'CreateAuthChallenge_Authentication',
    request: {
      userAttributes: {
        sub: 'abcd1234-1234-1234-1234-abcd12345678',
        email_verified: 'true',
        email: 'foo@example.com',
      },
      challengeName: 'CUSTOM_CHALLENGE',
      session: previousSessions ?? [],
      clientMetadata: clientMetadata,
      userNotFound: false,
    },
    response: {
      publicChallengeParameters: {},
      privateChallengeParameters: {},
    },
  };
};

describe('createAuthChallenge', () => {
  it('returns PROVIDE_AUTH_PARAMETERS if auth params have not yet been provided', async () => {
    const event = buildEvent();
    const updatedEvent = await createAuthChallenge(event);
    strictEqual(
      updatedEvent.response.challengeMetadata,
      'PROVIDE_AUTH_PARAMETERS'
    );
  });

  it('returns an error if for an unrecognized sign in method', async () => {
    const event = buildEvent([initialSession], { signInMethod: 'FOO' });
    const error = await createAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'Unrecognized signInMethod: FOO');
  });

  it('returns a not implemented exception when invoking magic link', async () => {
    const event = buildEvent([initialSession], requestMagicLinkMetaData);
    const error = await createAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'Magic Link not implemented.');
  });

  it('returns a not implemented exception when invoking otp', async () => {
    const event = buildEvent([initialSession], requestOTPMetaData);
    const error = await createAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'OTP not implemented.');
  });
});
