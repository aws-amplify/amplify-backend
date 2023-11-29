import {
  CreateAuthChallengeTriggerEvent,
  DefineAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { ChallengeResult } from '../types.js';

export const baseEvent = {
  version: '1',
  region: 'us-east-1',
  userPoolId: 'us-east-1_12345678',
  userName: '12345678-1234-1234-1234-123456789012',
  callerContext: {
    awsSdkVersion: 'aws-sdk-unknown-unknown',
    clientId: '12345678',
  },
};

export const phoneUserAttributes = {
  sub: '12345678-1234-1234-1234-123456789012',
  phone_number: '+15555555555',
  phone_number_verified: 'true',
};
export const emailUserAttributes = {
  sub: '12345678-1234-1234-1234-123456789012',
  email_verified: 'true',
  email: 'foo@example.com',
};

const baseRequest = {
  userAttributes: emailUserAttributes,
  userNotFound: false,
};

// Client metadata when requesting a magic link.
export const requestMagicLinkMetaData: PasswordlessClientMetaData = {
  signInMethod: 'MAGIC_LINK',
  action: 'REQUEST',
  deliveryMedium: 'EMAIL',
  redirectUri: 'https://example.com/sign-in-link/##code##',
};

// Client metadata when requesting an OTP via email.
export const requestOtpEmailMetaData: PasswordlessClientMetaData = {
  signInMethod: 'OTP',
  action: 'REQUEST',
  deliveryMedium: 'EMAIL',
};

// Client metadata when requesting an OTP via SMS.
export const requestOtpSmsMetaData: PasswordlessClientMetaData = {
  signInMethod: 'OTP',
  action: 'REQUEST',
  deliveryMedium: 'SMS',
};

// Client metadata when requesting an OTP via SMS.
export const confirmOtpMetaData: PasswordlessClientMetaData = {
  signInMethod: 'OTP',
  action: 'CONFIRM',
};

// Client metadata when requesting an OTP via SMS.
export const confirmMagicLinkMetaData: PasswordlessClientMetaData = {
  signInMethod: 'MAGIC_LINK',
  action: 'CONFIRM',
};

/**
 * Creates a mock event for Define Auth Challenge.
 */
export const buildDefineAuthChallengeEvent = (
  previousSessions?: [ChallengeResult]
): DefineAuthChallengeTriggerEvent => {
  return {
    ...baseEvent,
    triggerSource: 'DefineAuthChallenge_Authentication',
    request: {
      ...baseRequest,
      session: previousSessions ?? [],
    },
    response: {
      challengeName: '',
      failAuthentication: false,
      issueTokens: false,
    },
  };
};

/**
 * Creates a mock event for Create Auth Challenge.
 */
export const buildCreateAuthChallengeEvent = (
<<<<<<< HEAD
  previousSessions?: ChallengeResult[],
  clientMetadata?: PasswordlessClientMetaData | Record<string, string>,
  userAttributes: Record<string, string> = emailUserAttributes
=======
<<<<<<<< HEAD:packages/passwordless-auth-construct/src/custom-auth/event.mocks.ts
  previousSessions?: [ChallengeResult],
  clientMetadata?: Record<string, string>
========
  previousSessions?: ChallengeResult[],
  clientMetadata?: PasswordlessClientMetaData | Record<string, string>,
  userAttributes: Record<string, string> = emailUserAttributes
>>>>>>>> 0ae1e275f (feat(auth): OTP via SMS implementation  (#333)):packages/passwordless-auth-construct/src/mocks/challenge_events.mock.ts
>>>>>>> 0ae1e275f (feat(auth): OTP via SMS implementation  (#333))
): CreateAuthChallengeTriggerEvent => {
  return {
    ...baseEvent,
    triggerSource: 'CreateAuthChallenge_Authentication',
    request: {
      challengeName: 'CUSTOM_CHALLENGE',
      session: previousSessions ?? [],
      clientMetadata: clientMetadata,
      userAttributes: userAttributes,
      userNotFound: false,
    },
    response: {
      publicChallengeParameters: {},
      privateChallengeParameters: {},
      challengeMetadata: '',
    },
  };
};

/**
 * Creates a mock event for Verify Auth Challenge Response.
 */
export const buildVerifyAuthChallengeResponseEvent = (
<<<<<<< HEAD
  clientMetadata: PasswordlessClientMetaData | Record<string, string>,
  answer = '',
  privateChallengeParameters = {}
=======
  clientMetadata?: Record<string, string>
>>>>>>> 0ae1e275f (feat(auth): OTP via SMS implementation  (#333))
): VerifyAuthChallengeResponseTriggerEvent => {
  return {
    ...baseEvent,
    triggerSource: 'VerifyAuthChallengeResponse_Authentication',
    request: {
      ...baseRequest,
<<<<<<< HEAD
      privateChallengeParameters: privateChallengeParameters,
      challengeAnswer: answer,
=======
      privateChallengeParameters: {},
      challengeAnswer: 'answer',
>>>>>>> 0ae1e275f (feat(auth): OTP via SMS implementation  (#333))
      clientMetadata: clientMetadata,
    },
    response: {
      answerCorrect: false,
    },
  };
};
