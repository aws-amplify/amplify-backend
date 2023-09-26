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

// The custom auth session from the initial Cognito InitiateAuth call.
const initialSession: CustomChallengeResult = {
  challengeName: 'CUSTOM_CHALLENGE',
  challengeResult: false,
  challengeMetadata: 'PROVIDE_AUTH_PARAMETERS',
};

// Client metadata when requesting a magic link.
const requestMagicLinkMetaData: PasswordlessClientMetaData = {
  signInMethod: 'MAGIC_LINK',
  action: 'REQUEST',
  deliveryMedium: 'EMAIL',
  redirectUri: 'https://example.com/sign-in-link/##code##',
};

// Client metadata when requesting an OTP via email.
const requestOTPMetaData: PasswordlessClientMetaData = {
  signInMethod: 'OTP',
  action: 'REQUEST',
  deliveryMedium: 'EMAIL',
};

/**
 * Creates a mock lambda event for testing.
 * @param previousSessions - The array of sessions from previous challenges
 * @param clientMetadata - The client metadata included in the request from the client.
 * @returns a lambda trigger event for Create Auth Challenge.
 */
const buildEvent = (
  previousSessions?: Array<ChallengeResult | CustomChallengeResult>,
  clientMetadata?: PasswordlessClientMetaData | StringMap
): CreateAuthChallengeTriggerEvent => {
  return {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'us-east-1_12345678',
    userName: '12345678-1234-1234-1234-123456789012',
    callerContext: {
      awsSdkVersion: 'aws-sdk-unknown-unknown',
      clientId: '12345678',
    },
    triggerSource: 'CreateAuthChallenge_Authentication',
    request: {
      userAttributes: {
        sub: '12345678-1234-1234-1234-123456789012',
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

  it('returns an error for an unrecognized sign in method', async () => {
    const event = buildEvent([initialSession], { signInMethod: 'FOO' });
    const error = await createAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'Unrecognized signInMethod: FOO');
  });

  // TODO: remove when magic link is implemented.
  it('returns a not implemented exception when invoking magic link', async () => {
    const event = buildEvent([initialSession], requestMagicLinkMetaData);
    const error = await createAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'Magic Link not implemented.');
  });

  // TODO: remove when OTP is implemented.
  it('returns a not implemented exception when invoking OTP', async () => {
    const event = buildEvent([initialSession], requestOTPMetaData);
    const error = await createAuthChallenge(event).catch((error) => error);
    strictEqual(error.message, 'OTP not implemented.');
  });
});
