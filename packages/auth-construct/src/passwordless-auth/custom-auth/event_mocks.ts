import {
  ChallengeResult,
  CreateAuthChallengeTriggerEvent,
  CustomChallengeResult,
  PasswordlessClientMetaData,
  StringMap,
  VerifyAuthChallengeResponseTriggerEvent,
} from './types.js';

// The custom auth session from the initial Cognito InitiateAuth call.
export const initialSession: CustomChallengeResult = {
  challengeName: 'CUSTOM_CHALLENGE',
  challengeResult: false,
  challengeMetadata: 'PROVIDE_AUTH_PARAMETERS',
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

/**
 * Creates a mock lambda event for testing.
 * @param previousSessions - The array of sessions from previous challenges
 * @param clientMetadata - The client metadata included in the request from the client.
 * @returns a lambda trigger event for Create Auth Challenge.
 */
export const buildCreateAuthChallengeEvent = (
  previousSessions?: Array<ChallengeResult | CustomChallengeResult>,
  clientMetadata?: PasswordlessClientMetaData
): CreateAuthChallengeTriggerEvent => {
  const phoneAttributes = {
    sub: 'abcd1234-1234-1234-1234-abcd12345678',
    phone_number: '+15555555555',
    phone_number_verified: 'true',
  };
  const emailAttributes = {
    sub: 'abcd1234-1234-1234-1234-abcd12345678',
    email_verified: 'true',
    email: 'foo@example.com',
  };

  let userAttributes: StringMap = phoneAttributes;

  if (
    clientMetadata?.action === 'REQUEST' &&
    clientMetadata?.deliveryMedium === 'EMAIL'
  ) {
    userAttributes = emailAttributes;
  }

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
      userAttributes: userAttributes,
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

/**
 * Creates a mock lambda event for testing.
 * @param clientMetadata - The client metadata included in the request from the client.
 * @returns a lambda trigger event for Create Auth Challenge.
 */
export const buildVerifyAuthChallengeEvent = (
  clientMetadata?: PasswordlessClientMetaData
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
