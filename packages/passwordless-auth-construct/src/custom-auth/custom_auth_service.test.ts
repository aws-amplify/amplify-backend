import { describe, it, mock } from 'node:test';
import { strictEqual } from 'node:assert';
import { ChallengeResult, PasswordlessClientMetaData } from '../types.js';
import {
  buildCreateAuthChallengeEvent,
  buildDefineAuthChallengeEvent,
  buildVerifyAuthChallengeResponseEvent,
} from './event.mocks.js';
import { randomUUID } from 'node:crypto';
import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { CustomAuthService } from './custom_auth_service.js';
import { ChallengeService } from '../models/challenge_service.js';

// The custom auth session from the initial Cognito InitiateAuth call.
const initialSession: ChallengeResult = {
  challengeName: 'CUSTOM_CHALLENGE',
  challengeResult: false,
  challengeMetadata: 'PROVIDE_AUTH_PARAMETERS',
};

const customAuthService = new CustomAuthService();

void describe('defineAuthChallenge', () => {
  void it('returns CUSTOM_CHALLENGE if no session currently exists', async () => {
    const event = buildDefineAuthChallengeEvent();
    const updatedEvent = await customAuthService.defineAuthChallenge(event);
    strictEqual(updatedEvent.response.challengeName, 'CUSTOM_CHALLENGE');
    strictEqual(updatedEvent.response.failAuthentication, false);
  });

  void it('returns CUSTOM_CHALLENGE when action == REQUEST', async () => {
    const event = buildDefineAuthChallengeEvent([initialSession], {
      signInMethod: 'OTP',
      action: 'REQUEST',
    });
    const updatedEvent = await customAuthService.defineAuthChallenge(event);
    strictEqual(updatedEvent.response.challengeName, 'CUSTOM_CHALLENGE');
    strictEqual(updatedEvent.response.failAuthentication, false);
  });

  void it('returns tokens when the previous challengeResult == true', async () => {
    const verifyAuthChallengeSuccess: ChallengeResult = {
      challengeName: 'CUSTOM_CHALLENGE',
      challengeResult: true,
    };
    const event = buildDefineAuthChallengeEvent([verifyAuthChallengeSuccess], {
      signInMethod: 'OTP',
      action: 'CONFIRM',
    });
    const updatedEvent = await customAuthService.defineAuthChallenge(event);
    strictEqual(updatedEvent.response.failAuthentication, false);
    strictEqual(updatedEvent.response.issueTokens, true);
  });

  void it('fails authentication when the previous challengeResult == false', async () => {
    const verifyAuthChallengeFailure: ChallengeResult = {
      challengeName: 'CUSTOM_CHALLENGE',
      challengeResult: false,
    };
    const event = buildDefineAuthChallengeEvent([verifyAuthChallengeFailure], {
      signInMethod: 'OTP',
      action: 'CONFIRM',
    });
    const updatedEvent = await customAuthService.defineAuthChallenge(event);
    strictEqual(updatedEvent.response.failAuthentication, true);
    strictEqual(updatedEvent.response.issueTokens, false);
  });

  void it('fails authentication if any previous sessions were not a custom challenge', async () => {
    const srpSession: ChallengeResult = {
      challengeName: 'DEVICE_SRP_AUTH',
      challengeResult: false,
    };
    const event = buildDefineAuthChallengeEvent([srpSession]);
    const updatedEvent = await customAuthService.defineAuthChallenge(event);
    strictEqual(updatedEvent.response.failAuthentication, true);
  });

  void it('fails authentication for unknown sign in methods', async () => {
    const event = buildDefineAuthChallengeEvent([initialSession], {
      signInMethod: 'FOO',
      action: 'REQUEST',
    });
    const updatedEvent = await customAuthService.defineAuthChallenge(event);
    strictEqual(updatedEvent.response.failAuthentication, true);
  });

  void it('fails authentication for unknown actions', async () => {
    const event = buildDefineAuthChallengeEvent([initialSession], {
      signInMethod: 'OTP',
      action: 'FOO',
    });
    const updatedEvent = await customAuthService.defineAuthChallenge(event);
    strictEqual(updatedEvent.response.failAuthentication, true);
  });
});

void describe('createAuthChallenge', () => {
  void it('returns PROVIDE_AUTH_PARAMETERS if auth params have not yet been provided', async () => {
    const event = buildCreateAuthChallengeEvent();
    const updatedEvent = await customAuthService.createAuthChallenge(event);
    strictEqual(
      updatedEvent.response.challengeMetadata,
      'PROVIDE_AUTH_PARAMETERS'
    );
  });

  void it('returns an error for an unrecognized sign in method', async () => {
    const event = buildCreateAuthChallengeEvent([initialSession], {
      signInMethod: 'FOO',
      action: 'REQUEST',
    });
    const error = await customAuthService
      .createAuthChallenge(event)
      .catch((error) => error);
    strictEqual(error.message, 'Unrecognized signInMethod: FOO');
  });
});

void describe('verifyAuthChallenge', () => {
  void it('returns answerCorrect=false when the action is REQUEST', async () => {
    const event = buildVerifyAuthChallengeResponseEvent({
      signInMethod: 'OTP',
      action: 'REQUEST',
    });
    const updatedEvent = await customAuthService.verifyAuthChallenge(event);
    strictEqual(updatedEvent.response.answerCorrect, false);
  });
  void it('calls the appropriate service when the action is CONFIRM', async () => {
    const otpChallengeService = new MockChallengeService();
    const mockVerify = mock.method(otpChallengeService, 'verifyChallenge');

    const customAuthService = new CustomAuthService(otpChallengeService);
    const event = buildVerifyAuthChallengeResponseEvent({
      signInMethod: 'OTP',
      action: 'CONFIRM',
    });

    strictEqual(mockVerify.mock.callCount(), 0);
    await customAuthService.verifyAuthChallenge(event);
    strictEqual(mockVerify.mock.callCount(), 1);
  });
  void it('returns an error for an unrecognized sign in method', async () => {
    const event = buildVerifyAuthChallengeResponseEvent({
      signInMethod: 'FOO',
      action: 'CONFIRM',
    });
    const error = await customAuthService
      .verifyAuthChallenge(event)
      .catch((error) => error);
    strictEqual(error.message, 'Unrecognized signInMethod: FOO');
  });
});

// The following tests verify the integration of the three separate handlers by
// stubbing cognito's custom auth logic. See MockCognitoCustomAuth for details.
void describe('CustomAuthService', () => {
  void describe('initiateAuth', () => {
    void it('returns nextStep = PROVIDE_AUTH_PARAMETERS for a valid request', async () => {
      const cognito = new MockCognitoCustomAuth();
      const { challengeParameters } = await cognito.initiateAuth();
      strictEqual(challengeParameters?.nextStep, 'PROVIDE_AUTH_PARAMETERS');
    });
  });

  void describe('respondToAuthChallenge', () => {
    void it('returns the appropriate challenge params when action = REQUEST', async () => {
      const otpChallengeService = new MockChallengeService('correct-answer');
      const cognito = new MockCognitoCustomAuth(
        new CustomAuthService(otpChallengeService)
      );
      const { sessionId } = await cognito.initiateAuth();

      const { challengeParameters } = await cognito.respondToAuthChallenge(
        sessionId,
        '__dummy__',
        {
          signInMethod: 'OTP',
          action: 'REQUEST',
          deliveryMedium: 'EMAIL',
        }
      );

      strictEqual(challengeParameters?.deliveryMedium, 'EMAIL');
    });
    void it('returns an authenticated session for a correct answer.', async () => {
      const otpChallengeService = new MockChallengeService('correct-answer');
      const cognito = new MockCognitoCustomAuth(
        new CustomAuthService(otpChallengeService)
      );
      const { sessionId } = await cognito.initiateAuth();

      await cognito.respondToAuthChallenge(sessionId, '__dummy__', {
        signInMethod: 'OTP',
        action: 'REQUEST',
        deliveryMedium: 'EMAIL',
      });

      const { isAuthenticated } = await cognito.respondToAuthChallenge(
        sessionId,
        'correct-answer',
        {
          signInMethod: 'OTP',
          action: 'CONFIRM',
        }
      );

      strictEqual(isAuthenticated, true);
    });

    void it('does not return an authenticated session for an incorrect answer.', async () => {
      const otpChallengeService = new MockChallengeService('correct-answer');
      const cognito = new MockCognitoCustomAuth(
        new CustomAuthService(otpChallengeService)
      );
      const { sessionId } = await cognito.initiateAuth();

      await cognito.respondToAuthChallenge(sessionId, '__dummy__', {
        signInMethod: 'OTP',
        action: 'REQUEST',
        deliveryMedium: 'EMAIL',
      });

      const { isAuthenticated } = await cognito.respondToAuthChallenge(
        sessionId,
        'incorrect-answer',
        {
          signInMethod: 'OTP',
          action: 'CONFIRM',
        }
      );

      strictEqual(isAuthenticated, false);
    });
  });
});

/**
 * A stub of Cognito's custom auth implementation / API.
 *
 * Cognito exposes two APIs for custom auth, and invokes the three handlers
 * based on the arguments provided to those APIs and the responses from the
 * previous invocations of the handlers. This class mimics that logic.
 */
class MockCognitoCustomAuth {
  constructor(private customAuthService = new CustomAuthService()) {}

  private sessions: Record<
    string,
    {
      challenges: ChallengeResult[];
      privateChallengeParameters?: Record<string, string>;
    }
  > = {};

  /**
   * A stub of Cognito's InitiateAuth API for Custom Auth. Creates a new session
   * and then invokes Define Auth Challenge. If the response from Define Auth
   * Challenge is CUSTOM_CHALLENGE, Create Auth Challenge is then invoked and
   * the privateChallengeParameters are stored.
   * @returns A mock authentication response.
   */
  initiateAuth = async (): Promise<AuthResponse> => {
    const sessionId = randomUUID();
    this.sessions[sessionId] = { challenges: [] };
    return this.defineAuthChallenge(sessionId);
  };

  /**
   * A stub of Cognito's ResponseToAuthChallenge API for Custom Auth. Looks
   * up the session from the sessionId and then invokes Verify Auth Challenge
   * with the sessions privateChallengeParameters. Define Auth Challenge is then
   * invoked with the response.
   * @param sessionId - The session identifier.
   * @param answer - The Answer provided by the client.
   * @param metadata - Any metadata from the client.
   * @returns A mock authentication response.
   */
  respondToAuthChallenge = async (
    sessionId: string,
    answer: string,
    metadata: PasswordlessClientMetaData
  ): Promise<AuthResponse> => {
    const session = this.sessions[sessionId];
    const event = buildVerifyAuthChallengeResponseEvent(
      metadata,
      answer,
      session.privateChallengeParameters
    );
    const { response } = await this.customAuthService.verifyAuthChallenge(
      event
    );
    this.sessions[sessionId].challenges.push({
      challengeName: 'CUSTOM_CHALLENGE',
      challengeResult: response.answerCorrect,
    });
    return this.defineAuthChallenge(sessionId, metadata);
  };

  private defineAuthChallenge = async (
    sessionId: string,
    metadata?: PasswordlessClientMetaData
  ): Promise<AuthResponse> => {
    const event = buildDefineAuthChallengeEvent(
      this.sessions[sessionId].challenges,
      metadata
    );
    const { response } = await this.customAuthService.defineAuthChallenge(
      event
    );
    if (response.challengeName == 'CUSTOM_CHALLENGE') {
      const createEvent = buildCreateAuthChallengeEvent(
        this.sessions[sessionId].challenges,
        metadata
      );
      const { response } = await this.customAuthService.createAuthChallenge(
        createEvent
      );
      this.sessions[sessionId].privateChallengeParameters =
        response.privateChallengeParameters;
      return {
        sessionId,
        isAuthenticated: false,
        challengeParameters: response.publicChallengeParameters,
      };
    }
    return {
      sessionId,
      isAuthenticated: response.issueTokens,
    };
  };
}

type AuthResponse = {
  sessionId: string;
  isAuthenticated: boolean;
  challengeParameters?: Record<string, string>;
};

class MockChallengeService implements ChallengeService {
  constructor(private answer: string = '123456') {}
  createChallenge = async (
    event: CreateAuthChallengeTriggerEvent
  ): Promise<CreateAuthChallengeTriggerEvent> => {
    return {
      ...event,
      response: {
        ...event.response,
        publicChallengeParameters: {
          deliveryMedium: 'EMAIL',
          destination: 'foo@example.com',
        },
        privateChallengeParameters: {
          code: this.answer,
        },
      },
    };
  };

  verifyChallenge = async (
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
  };
}
