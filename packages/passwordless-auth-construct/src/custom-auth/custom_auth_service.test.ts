import { describe, it, mock } from 'node:test';
import { equal, rejects, strictEqual } from 'node:assert';
import {
  ChallengeResult,
  ChallengeService,
  CodeDeliveryDetails,
} from '../types.js';
import { CognitoMetadataKeys } from '../constants.js';
import {
  buildCreateAuthChallengeEvent,
  buildDefineAuthChallengeEvent,
  buildVerifyAuthChallengeResponseEvent,
  requestOtpSmsMetaData,
} from '../mocks/challenge_events.mock.js';
import {
  CreateAuthChallengeTriggerEvent,
  DefineAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { CustomAuthService } from './custom_auth_service.js';

// The custom auth session from the initial Cognito InitiateAuth call.
const initialSession: ChallengeResult = {
  challengeName: 'CUSTOM_CHALLENGE',
  challengeResult: false,
  challengeMetadata: 'PROVIDE_AUTH_PARAMETERS',
};

const mockChallengeService: ChallengeService = {
  signInMethod: 'OTP',
  maxAttempts: 1,
  createChallenge: async (
    deliveryDetails: CodeDeliveryDetails,
    destination: string,
    event: CreateAuthChallengeTriggerEvent
  ): Promise<CreateAuthChallengeTriggerEvent> => {
    return {
      ...event,
      response: {
        ...event.response,
        publicChallengeParameters: {
          ...deliveryDetails,
          destination,
        },
        privateChallengeParameters: {
          code: 'correct-answer',
        },
      },
    };
  },
  verifyChallenge: async (
    event: VerifyAuthChallengeResponseTriggerEvent
  ): Promise<VerifyAuthChallengeResponseTriggerEvent> => {
    return {
      ...event,
      response: {
        ...event.response,
        answerCorrect:
          event.request.challengeAnswer ===
          event.request.privateChallengeParameters.code,
      },
    };
  },
};

const customAuthService = new CustomAuthService({
  getService: () => mockChallengeService,
});

void describe('defineAuthChallenge', () => {
  /**
   * Returns true if the response is a Custom Challenge Response. This results
   * in Cognito invoking Create Auth Challenge.
   */
  const isCustomChallengeResponse = (
    response: DefineAuthChallengeTriggerEvent['response']
  ) => {
    return (
      response.challengeName === 'CUSTOM_CHALLENGE' &&
      response.failAuthentication === false
    );
  };

  /**
   * Returns true if the response a failed authentication response. This
   * results in Cognito returning an error to the client.
   */
  const isFailedAuthentication = (
    response: DefineAuthChallengeTriggerEvent['response']
  ) => {
    return (
      response.failAuthentication === true && response.issueTokens === false
    );
  };

  /**
   * Returns true if the response a failed authentication response. This
   * results in Cognito issuing tokens to the client.
   */
  const isSuccessfulAuthentication = (
    response: DefineAuthChallengeTriggerEvent['response']
  ) => {
    return (
      response.failAuthentication === false && response.issueTokens === true
    );
  };

  void describe('no previous session exists', () => {
    const previousSessions: ChallengeResult[] = [];
    const event = buildDefineAuthChallengeEvent(previousSessions);
    void it('starts a new custom challenge', async () => {
      const { response } = await customAuthService.defineAuthChallenge(event);
      strictEqual(isCustomChallengeResponse(response), true);
    });
  });

  void describe('action = REQUEST', () => {
    const previousSessions: ChallengeResult[] = [initialSession];
    void it('starts a new custom challenge', async () => {
      const event = buildDefineAuthChallengeEvent(previousSessions, {
        [CognitoMetadataKeys.SIGN_IN_METHOD]: 'OTP',
        [CognitoMetadataKeys.ACTION]: 'REQUEST',
      });
      const { response } = await customAuthService.defineAuthChallenge(event);
      strictEqual(isCustomChallengeResponse(response), true);
    });
  });

  void describe('action = CONFIRM', () => {
    const metadata = {
      [CognitoMetadataKeys.SIGN_IN_METHOD]: 'OTP',
      [CognitoMetadataKeys.ACTION]: 'CONFIRM',
    };
    const successResult: ChallengeResult = {
      challengeName: 'CUSTOM_CHALLENGE',
      challengeResult: true,
    };
    const failedResult: ChallengeResult = {
      challengeName: 'CUSTOM_CHALLENGE',
      challengeResult: false,
    };
    void it('returns tokens when the previous challengeResult == true', async () => {
      const event = buildDefineAuthChallengeEvent([successResult], metadata);
      const { response } = await customAuthService.defineAuthChallenge(event);
      strictEqual(isSuccessfulAuthentication(response), true);
    });
    void it('it returns tokens up to three attempts', async () => {
      const failedResult: ChallengeResult = {
        challengeName: 'CUSTOM_CHALLENGE',
        challengeResult: false,
      };
      const twoAttemptsEvent = buildDefineAuthChallengeEvent(
        [failedResult, successResult],
        metadata
      );
      const { response: twoAttemptsResponse } =
        await customAuthService.defineAuthChallenge(twoAttemptsEvent);
      strictEqual(isSuccessfulAuthentication(twoAttemptsResponse), true);

      const threeAttemptsEvent = buildDefineAuthChallengeEvent(
        [failedResult, failedResult, successResult],
        metadata
      );
      const { response: threeAttemptsResponse } =
        await customAuthService.defineAuthChallenge(threeAttemptsEvent);
      strictEqual(isSuccessfulAuthentication(threeAttemptsResponse), true);
    });
    void it('fails authentication after three challengeResult == false results', async () => {
      const event = buildDefineAuthChallengeEvent(
        [failedResult, failedResult, failedResult],
        metadata
      );
      const { response } = await customAuthService.defineAuthChallenge(event);
      strictEqual(isFailedAuthentication(response), true);
    });
  });

  void describe('bad requests', () => {
    void it('fails authentication for unsupported sign in method', async () => {
      const metadata = {
        [CognitoMetadataKeys.SIGN_IN_METHOD]: 'FOO',
        [CognitoMetadataKeys.ACTION]: 'CONFIRM',
      };
      const event = buildDefineAuthChallengeEvent([initialSession], metadata);
      const { response } = await customAuthService.defineAuthChallenge(event);
      strictEqual(isFailedAuthentication(response), true);
    });
    void it('fails authentication for unsupported action', async () => {
      const metadata = {
        [CognitoMetadataKeys.SIGN_IN_METHOD]: 'OTP',
        [CognitoMetadataKeys.ACTION]: 'FOO',
      };
      const event = buildDefineAuthChallengeEvent([initialSession], metadata);
      const { response } = await customAuthService.defineAuthChallenge(event);
      strictEqual(isFailedAuthentication(response), true);
    });
    void it('fails authentication for a previous non custom challenge', async () => {
      const srpSession: ChallengeResult = {
        challengeName: 'DEVICE_SRP_AUTH', // only 'CUSTOM_CHALLENGE'is supported
        challengeResult: false,
      };
      const event = buildDefineAuthChallengeEvent([srpSession]);
      const { response } = await customAuthService.defineAuthChallenge(event);
      strictEqual(isFailedAuthentication(response), true);
    });
  });
});

/**
 * Returns true if the response contains the metadata 'PROVIDE_AUTH_PARAMETERS'.
 *
 * This response informs the client that additional metadata (action & sign in
 * method) is required to complete the request.
 */
const containsProvideParametersMetadata = (
  response: CreateAuthChallengeTriggerEvent['response']
) => {
  return response.challengeMetadata === 'PROVIDE_AUTH_PARAMETERS';
};

void describe('createAuthChallenge', () => {
  void describe('no previous session exists', () => {
    void it('returns PROVIDE_AUTH_PARAMETERS', async () => {
      const event = buildCreateAuthChallengeEvent();
      const { response } = await customAuthService.createAuthChallenge(event);
      strictEqual(containsProvideParametersMetadata(response), true);
    });
  });

  void describe('action = REQUEST', () => {
    const mockCreate = mock.method(mockChallengeService, 'createChallenge');
    const metadata = {
      [CognitoMetadataKeys.SIGN_IN_METHOD]: 'OTP',
      [CognitoMetadataKeys.ACTION]: 'REQUEST',
      [CognitoMetadataKeys.DELIVERY_MEDIUM]: 'SMS',
    };
    const userAttributes = {
      phone_number: '+5555557890',
      phone_number_verified: 'true',
    };
    void it('calls createAuthChallenge on the challenge service if event is valid', async () => {
      const event = buildCreateAuthChallengeEvent(
        [initialSession],
        metadata,
        userAttributes
      );
      strictEqual(mockCreate.mock.callCount(), 0);
      await customAuthService.createAuthChallenge(event);
      strictEqual(mockCreate.mock.callCount(), 1);
    });
    void it('throws an error if validateCreateAuthChallengeEvent throws', async () => {
      const challengeService: ChallengeService = {
        ...mockChallengeService,
        validateCreateAuthChallengeEvent: () => {
          throw new Error('missing required metadata.');
        },
      };
      const customAuthService = new CustomAuthService({
        getService: () => challengeService,
      });
      const metadata = {
        signInMethod: 'OTP',
        action: 'REQUEST',
        deliveryMedium: 'SMS',
      };
      const event = buildCreateAuthChallengeEvent(
        [initialSession],
        metadata,
        userAttributes
      );
      await rejects(
        async () => customAuthService.createAuthChallenge(event),
        Error('missing required metadata.')
      );
    });
  });

  void describe('bad requests', () => {
    void it('throws an error for an unsupported action', async () => {
      const event = buildCreateAuthChallengeEvent([initialSession], {
        [CognitoMetadataKeys.SIGN_IN_METHOD]: 'OTP',
        [CognitoMetadataKeys.ACTION]: 'FOO',
      });
      await rejects(
        async () => customAuthService.createAuthChallenge(event),
        Error('Unsupported action for Create Auth: FOO')
      );
    });
    void it('throws an error for an unsupported sign in method', async () => {
      const event = buildCreateAuthChallengeEvent([initialSession], {
        [CognitoMetadataKeys.SIGN_IN_METHOD]: 'FOO',
        [CognitoMetadataKeys.ACTION]: 'REQUEST',
        [CognitoMetadataKeys.DELIVERY_MEDIUM]: 'SMS',
      });
      await rejects(
        async () => customAuthService.createAuthChallenge(event),
        Error('Unrecognized signInMethod: FOO')
      );
    });
    void it('should throw an error if deliveryMedium is not SMS or EMAIL', async () => {
      const fakeDeliveryMedium = 'PHONE';
      const event: CreateAuthChallengeTriggerEvent =
        buildCreateAuthChallengeEvent([initialSession], {
          ...requestOtpSmsMetaData,
          [CognitoMetadataKeys.DELIVERY_MEDIUM]: fakeDeliveryMedium,
        });

      await rejects(
        async () => customAuthService.createAuthChallenge(event),
        Error(
          `Invalid delivery medium: ${fakeDeliveryMedium}. Only SMS and email are supported.`
        )
      );
    });
  });

  void describe('prevents user existence errors when user is not found or email/phone is not verified.', () => {
    void it('user not found', async () => {
      const baseEvent = buildCreateAuthChallengeEvent([initialSession], {
        [CognitoMetadataKeys.SIGN_IN_METHOD]: 'OTP',
        [CognitoMetadataKeys.ACTION]: 'REQUEST',
        [CognitoMetadataKeys.DELIVERY_MEDIUM]: 'SMS',
      });
      const event = {
        ...baseEvent,
        request: {
          ...baseEvent.request,
          userNotFound: true,
        },
      };
      const { response } = await customAuthService.createAuthChallenge(event);
      equal(response.publicChallengeParameters.attributeName, 'phone_number');
      equal(response.publicChallengeParameters.deliveryMedium, 'SMS');
    });
    void it('no email attribute', async () => {
      const event = buildCreateAuthChallengeEvent(
        [initialSession],
        {
          [CognitoMetadataKeys.SIGN_IN_METHOD]: 'OTP',
          [CognitoMetadataKeys.ACTION]: 'REQUEST',
          [CognitoMetadataKeys.DELIVERY_MEDIUM]: 'EMAIL',
        },
        {}
      );
      const { response } = await customAuthService.createAuthChallenge(event);
      equal(response.publicChallengeParameters.attributeName, 'email');
      equal(response.publicChallengeParameters.deliveryMedium, 'EMAIL');
    });
    void it('email not verified', async () => {
      const event = buildCreateAuthChallengeEvent(
        [initialSession],
        {
          [CognitoMetadataKeys.SIGN_IN_METHOD]: 'OTP',
          [CognitoMetadataKeys.ACTION]: 'REQUEST',
          [CognitoMetadataKeys.DELIVERY_MEDIUM]: 'EMAIL',
        },
        { email: 'foo@example.com', email_verified: 'false' }
      );
      const { response } = await customAuthService.createAuthChallenge(event);
      equal(response.publicChallengeParameters.attributeName, 'email');
      equal(response.publicChallengeParameters.deliveryMedium, 'EMAIL');
    });
    void it('no phone attribute', async () => {
      const event = buildCreateAuthChallengeEvent(
        [initialSession],
        {
          [CognitoMetadataKeys.SIGN_IN_METHOD]: 'OTP',
          [CognitoMetadataKeys.ACTION]: 'REQUEST',
          [CognitoMetadataKeys.DELIVERY_MEDIUM]: 'SMS',
        },
        {}
      );
      const { response } = await customAuthService.createAuthChallenge(event);
      equal(response.publicChallengeParameters.attributeName, 'phone_number');
      equal(response.publicChallengeParameters.deliveryMedium, 'SMS');
    });
    void it('phone not verified', async () => {
      const event = buildCreateAuthChallengeEvent(
        [initialSession],
        {
          [CognitoMetadataKeys.SIGN_IN_METHOD]: 'OTP',
          [CognitoMetadataKeys.ACTION]: 'REQUEST',
          [CognitoMetadataKeys.DELIVERY_MEDIUM]: 'SMS',
        },
        { phone_number: '+15555557890', phone_number_verified: 'false' }
      );
      const { response } = await customAuthService.createAuthChallenge(event);
      equal(response.publicChallengeParameters.attributeName, 'phone_number');
      equal(response.publicChallengeParameters.deliveryMedium, 'SMS');
    });
  });
});

void describe('verifyAuthChallenge', () => {
  void describe('action = request', () => {
    void it('returns answerCorrect=false', async () => {
      const event = buildVerifyAuthChallengeResponseEvent({
        [CognitoMetadataKeys.SIGN_IN_METHOD]: 'OTP',
        [CognitoMetadataKeys.ACTION]: 'REQUEST',
        [CognitoMetadataKeys.DELIVERY_MEDIUM]: 'SMS',
      });
      const { response } = await customAuthService.verifyAuthChallenge(event);
      strictEqual(response.answerCorrect, false);
    });
  });

  void describe('action = confirm', () => {
    void it('calls verifyAuthChallenge on the challenge service', async () => {
      const mockVerify = mock.method(mockChallengeService, 'verifyChallenge');
      const event = buildVerifyAuthChallengeResponseEvent({
        [CognitoMetadataKeys.SIGN_IN_METHOD]: 'MAGIC_LINK',
        [CognitoMetadataKeys.ACTION]: 'CONFIRM',
        [CognitoMetadataKeys.DELIVERY_MEDIUM]: 'EMAIL',
      });
      strictEqual(mockVerify.mock.callCount(), 0);
      await customAuthService.verifyAuthChallenge(event);
      strictEqual(mockVerify.mock.callCount(), 1);
    });
  });

  void describe('bad requests', () => {
    void it('throws an error for an unsupported action', async () => {
      const event = buildVerifyAuthChallengeResponseEvent({
        [CognitoMetadataKeys.SIGN_IN_METHOD]: 'OTP',
        [CognitoMetadataKeys.ACTION]: 'FOO',
        [CognitoMetadataKeys.DELIVERY_MEDIUM]: 'SMS',
      });
      await rejects(
        async () => customAuthService.verifyAuthChallenge(event),
        Error('Unsupported action: FOO')
      );
    });
    void it('throws an error for an unsupported sign in method', async () => {
      const event = buildVerifyAuthChallengeResponseEvent({
        [CognitoMetadataKeys.SIGN_IN_METHOD]: 'FOO',
        [CognitoMetadataKeys.ACTION]: 'CONFIRM',
      });
      await rejects(
        async () => customAuthService.verifyAuthChallenge(event),
        Error('Unrecognized signInMethod: FOO')
      );
    });
  });
});
