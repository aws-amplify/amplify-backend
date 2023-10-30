import {
  CreateAuthChallengeTriggerEvent,
  DefineAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { ChallengeResult, PasswordlessClientMetaData } from '../types.js';

const baseEvent = {
  version: '1',
  region: 'us-east-1',
  userPoolId: 'us-east-1_12345678',
  userName: '12345678-1234-1234-1234-123456789012',
  callerContext: {
    awsSdkVersion: 'aws-sdk-unknown-unknown',
    clientId: '12345678',
  },
};

const baseRequest = {
  userAttributes: {
    sub: '12345678-1234-1234-1234-123456789012',
    email_verified: 'true',
    email: 'foo@example.com',
  },
  userNotFound: false,
};

/**
 * Creates a mock event for Define Auth Challenge.
 */
export const buildDefineAuthChallengeEvent = (
  previousSessions?: ChallengeResult[],
  clientMetadata?: PasswordlessClientMetaData | Record<string, string>
): DefineAuthChallengeTriggerEvent => {
  return {
    ...baseEvent,
    triggerSource: 'DefineAuthChallenge_Authentication',
    request: {
      ...baseRequest,
      session: previousSessions ?? [],
      clientMetadata: clientMetadata,
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
  previousSessions?: ChallengeResult[],
  clientMetadata?: PasswordlessClientMetaData | Record<string, string>
): CreateAuthChallengeTriggerEvent => {
  return {
    ...baseEvent,
    triggerSource: 'CreateAuthChallenge_Authentication',
    request: {
      ...baseRequest,
      challengeName: 'CUSTOM_CHALLENGE',
      session: previousSessions ?? [],
      clientMetadata: clientMetadata,
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
  clientMetadata: PasswordlessClientMetaData | Record<string, string>,
  answer = '',
  privateChallengeParameters = {}
): VerifyAuthChallengeResponseTriggerEvent => {
  return {
    ...baseEvent,
    triggerSource: 'VerifyAuthChallengeResponse_Authentication',
    request: {
      ...baseRequest,
      privateChallengeParameters: privateChallengeParameters,
      challengeAnswer: answer,
      clientMetadata: clientMetadata,
    },
    response: {
      answerCorrect: false,
    },
  };
};
