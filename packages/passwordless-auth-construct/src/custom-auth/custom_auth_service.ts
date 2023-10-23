import {
  CreateAuthChallengeTriggerEvent,
  DefineAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { logger } from '../logger.js';
import { PasswordlessAuthChallengeParams } from '../types.js';
import { MagicLinkChallengeService } from '../magic-link/magic_link_challenge_service.js';
import { OtpChallengeService } from '../otp/otp_challenge_service.js';
import { ChallengeService } from '../models/challenge_service.js';

/**
 * A class containing the Cognito Auth triggers used for Custom Auth.
 */
export class CustomAuthService {
  /**
   * Creates a new CustomAuthService instance.
   * @param otpChallengeService - The service to use for OTP.
   * @param magicLinkChallengeService - The service to use for Magic Link.
   */
  constructor(
    private otpChallengeService: ChallengeService = new OtpChallengeService(),
    private magicLinkChallengeService: ChallengeService = new MagicLinkChallengeService()
  ) {}

  /**
   * The Define Auth Challenge lambda handler.
   * @param event - The Define Auth Challenge event provided by Cognito.
   * @returns the response, including the challenge name.
   *
   * Reference: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-define-auth-challenge.html
   */
  public defineAuthChallenge = async (
    event: DefineAuthChallengeTriggerEvent
  ): Promise<DefineAuthChallengeTriggerEvent> => {
    logger.debug(JSON.stringify(event, null, 2));

    // If there are no previous sessions, return a custom challenge. This will
    // result in Create Auth Challenge being invoked. Create Auth Challenge will
    // then return a dummy challenge to request auth parameters.
    const previousSessions = event.request.session ?? [];
    if (!previousSessions.length) {
      logger.info('No session yet, starting one ...');
      return this.customChallenge(event);
    }

    // Fail authentication if any previous challenges were not a custom challenge.
    const onlyContainsCustomChallenges = previousSessions.every(
      (attempt) => attempt.challengeName === 'CUSTOM_CHALLENGE'
    );
    if (!onlyContainsCustomChallenges) {
      return this.failAuthentication(event, 'Expected CUSTOM_CHALLENGE');
    }

    const { action, signInMethod } = event.request.clientMetadata ?? {};
    logger.info(`Requested signInMethod: ${signInMethod} and action ${action}`);

    if (signInMethod !== 'MAGIC_LINK' && signInMethod !== 'OTP') {
      return this.failAuthentication(
        event,
        `Unrecognized method: ${signInMethod}`
      );
    }

    // If the client is requesting a new challenge, return custom challenge
    if (action === 'REQUEST') {
      return this.customChallenge(event);
    }

    // If the client is confirming a challenge, issue tokens or fail auth based on
    // the last response, which is from Verify Auth Challenge.
    if (action === 'CONFIRM') {
      const lastResponse = previousSessions.slice(-1)[0];
      if (lastResponse.challengeResult === true) {
        return this.issueTokens(event);
      }
      // TODO: Implement retry attempts for OTP.
      return this.failAuthentication(event, 'challengeResult = false');
    }

    return this.failAuthentication(event, `Unrecognized action: ${action}`);
  };

  /**
   * The Create Auth Challenge lambda handler.
   * @param event - The Create Auth Challenge event provided by Cognito.
   * @returns the response, including the public and private challenge params.
   *
   * Reference: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-create-auth-challenge.html
   */
  public createAuthChallenge = async (
    event: CreateAuthChallengeTriggerEvent
  ): Promise<CreateAuthChallengeTriggerEvent> => {
    logger.debug(JSON.stringify(event, null, 2));
    const previousSessions = event.request.session;

    // If there are no previous sessions, this is the first time CreateAuthChallenge is called.
    // In this scenario, a dummy challenge is created to allow the client to send a challenge
    // response with client metadata that contains auth parameters.
    // This is required because Cognito only passes client metadata to custom auth triggers
    // when the RespondToAuthChallenge API is invoked. Client metadata is not included when the
    // InitiateAuth API is invoked.
    // See: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html#CognitoUserPools-InitiateAuth-request-ClientMetadata
    if (!previousSessions || !previousSessions.length) {
      return this.provideAuthParameters(event);
    }

    const { action, signInMethod } = event.request.clientMetadata ?? {};
    logger.info(`Requested signInMethod: ${signInMethod} and action ${action}`);

    if (action != 'REQUEST') {
      throw new Error(`Unsupported action for Create Auth: ${action}`);
    }

    if (signInMethod === 'MAGIC_LINK') {
      return this.magicLinkChallengeService.createChallenge(event);
    }

    if (signInMethod === 'OTP') {
      return this.otpChallengeService.createChallenge(event);
    }

    throw new Error(`Unrecognized signInMethod: ${signInMethod}`);
  };

  /**
   * The Verify Auth Challenge Response lambda handler.
   * @param event - The Verify Auth Challenge Response event provided by Cognito.
   * @returns the response, including whether or not the answer was correct.
   *
   * Reference: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-verify-auth-challenge-response.html
   */
  public verifyAuthChallenge = async (
    event: VerifyAuthChallengeResponseTriggerEvent
  ): Promise<VerifyAuthChallengeResponseTriggerEvent> => {
    logger.debug(JSON.stringify(event, null, 2));
    const { action, signInMethod } = event.request.clientMetadata ?? {};
    logger.info(`Requested signInMethod: ${signInMethod} and action ${action}`);

    // If the client is requesting a new challenge, return the event. This will
    // allow Define Auth Challenge re-route the request Create Auth Challenge.
    if (action === 'REQUEST') {
      return {
        ...event,
        response: { ...event.response, answerCorrect: false },
      };
    }

    if (action !== 'CONFIRM') {
      throw new Error(`Unsupported action: ${action}`);
    }

    if (signInMethod === 'MAGIC_LINK') {
      return this.magicLinkChallengeService.verifyChallenge(event);
    }

    if (signInMethod === 'OTP') {
      return this.otpChallengeService.verifyChallenge(event);
    }

    throw new Error(`Unrecognized signInMethod: ${signInMethod}`);
  };

  /**
   * Adds metadata to the event to indicate that auth parameters need to be supplied.
   * @param event - The lambda event.
   */
  private provideAuthParameters = async (
    event: CreateAuthChallengeTriggerEvent
  ): Promise<CreateAuthChallengeTriggerEvent> => {
    logger.info('Creating challenge: PROVIDE_AUTH_PARAMETERS');
    const parameters: PasswordlessAuthChallengeParams = {
      nextStep: 'PROVIDE_AUTH_PARAMETERS',
    };
    return {
      ...event,
      response: {
        challengeMetadata: 'PROVIDE_AUTH_PARAMETERS',
        privateChallengeParameters: parameters,
        publicChallengeParameters: parameters,
      },
    };
  };

  /**
   * Returns an event to issue tokens and returns it.
   * @param event - The lambda event.
   * @returns The updated event.
   */
  private issueTokens = (event: DefineAuthChallengeTriggerEvent) => {
    logger.info('Issuing tokens');
    return {
      ...event,
      response: {
        ...event.response,
        issueTokens: true,
        failAuthentication: false,
      },
    };
  };

  /**
   * Updates the event to fail authentication and returns it.
   * @param event - The lambda event.
   * @param reason - The reason that authentication has failed.
   * @returns the updated event.
   */
  private failAuthentication = (
    event: DefineAuthChallengeTriggerEvent,
    reason: string
  ) => {
    logger.info('Failing authentication because:', reason);
    return {
      ...event,
      response: {
        ...event.response,
        issueTokens: false,
        failAuthentication: true,
      },
    };
  };

  /**
   * Returns an event with the name `CUSTOM_CHALLENGE`. This
   * results in the Create Auth Challenge trigger being invoked by Cognito.
   * @param event - The lambda event.
   * @returns the updated event.
   */
  private customChallenge = (event: DefineAuthChallengeTriggerEvent) => {
    logger.info('Next step: Create Auth Challenge');
    return {
      ...event,
      response: {
        challengeName: 'CUSTOM_CHALLENGE',
        issueTokens: false,
        failAuthentication: false,
      },
    };
  };
}
