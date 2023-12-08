import {
  CreateAuthChallengeTriggerEvent,
  DefineAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { ChallengeServiceFactory } from '../factories/challenge_service_factory.js';
import { logger } from '../logger.js';
import {
  CodeDeliveryDetails,
  DeliveryMedium,
  PasswordlessAuthChallengeParams,
  RespondToAutChallengeParams,
  SignInMethod,
} from '../types.js';
import { CognitoMetadataKeys } from '../constants.js';
import { AdminUpdateUserAttributesCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

/**
 * A class containing the Cognito Auth triggers used for Custom Auth.
 */
export class CustomAuthService {
  /**
   * Creates a new CustomAuthService instance.
   * @param challengeServiceFactory - A factory for creating challenge services.
   */
  constructor(private challengeServiceFactory: ChallengeServiceFactory) { }

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

    const clientMetadata = event.request.clientMetadata || {};
    const action = clientMetadata[CognitoMetadataKeys.ACTION];
    const signInMethod = clientMetadata[CognitoMetadataKeys.SIGN_IN_METHOD];
    const attempts = this.countAttempts(event);
    logger.info(
      `Requested signInMethod: ${signInMethod},  action: ${action}, attempt: ${attempts}`
    );

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

    // If the client is confirming a challenge, issue tokens, allow retry, or fail auth based on
    // the last response, which is from Verify Auth Challenge.
    if (action === 'CONFIRM') {
      const lastResponse = previousSessions.slice(-1)[0];
      if (lastResponse.challengeResult === true) {
        return this.issueTokens(event);
      }

      // Check the number of failed attempts allowed.
      if (
        attempts <
        this.challengeServiceFactory.getService(signInMethod).maxAttempts
      ) {
        // If the number of attempts is less than 3, return a custom challenge (restart sign in flow).
        logger.info('Challenge failed, retrying ...');
        return this.customChallenge(event);
      }

      // If the number of attempts is 3 or more, fail authentication.
      return this.failAuthentication(
        event,
        'Reached the maximum number of incorrect challenge attempts.'
      );
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

    const clientMetadata = event.request.clientMetadata || {};
    const signInMethod = clientMetadata[CognitoMetadataKeys.SIGN_IN_METHOD];
    const signInAction = clientMetadata[CognitoMetadataKeys.ACTION];
    const method = this.validateSignInMethod(signInMethod);
    const action = this.validateAction(signInAction);
    logger.info(`Requested signInMethod: ${signInMethod} and action ${action}`);

    const { deliveryMedium, attributeName } =
      this.validateDeliveryCodeDetails(event);

    const { destination, isFirstSignInAttempt, isVerified } =
      this.validateDestination(deliveryMedium, event);

    const challengeService = this.challengeServiceFactory.getService(method);

    // ensure event is valid before checking for user existence to prevent
    // returning an error that would reveal user existence.
    if (challengeService.validateCreateAuthChallengeEvent) {
      challengeService.validateCreateAuthChallengeEvent(event);
    }

    // If the user is not found or if the attribute requested for challenge
    // delivery is not verified, return a fake successful response to prevent
    // user enumeration
    if (event.request.userNotFound) {
      logger.info(
        'User not found or user does not have a verified phone/email.'
      );
      const publicChallengeParameters: RespondToAutChallengeParams = {
        nextStep: 'PROVIDE_CHALLENGE_RESPONSE',
        ...event.response.publicChallengeParameters,
        attributeName,
        deliveryMedium,
      };
      const response: CreateAuthChallengeTriggerEvent = {
        ...event,
        response: {
          ...event.response,
          publicChallengeParameters,
        },
      };
      logger.debug(JSON.stringify(response, null, 2));
      return response;
    }

    return challengeService.createChallenge(
      { deliveryMedium, attributeName },
      destination,
      event
    );
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
    const clientMetadata = event.request.clientMetadata || {};
    const action = clientMetadata[CognitoMetadataKeys.ACTION];
    const signInMethod = clientMetadata[CognitoMetadataKeys.SIGN_IN_METHOD];
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

    const method = this.validateSignInMethod(signInMethod);

    const verifyResult = this.challengeServiceFactory
      .getService(method)
      .verifyChallenge(event);

    const answerCorrect = (await verifyResult).response.answerCorrect;
    logger.debug(`Answer is correct: ${answerCorrect ? 'true' : 'false'}`);

    try {
      const passwordlessConfiguration =
        event.request.userAttributes[PASSWORDLESS_SIGN_UP_ATTR_NAME] &&
        JSON.parse(
          event.request.userAttributes[PASSWORDLESS_SIGN_UP_ATTR_NAME]
        );

      if (passwordlessConfiguration.allowSignInAttempt) {
        const attributeName =
          passwordlessConfiguration.deliveryMedium === 'SMS'
            ? 'phone_number_verified'
            : 'email_verified';

        const attributeVerified =
          event.request.userAttributes[attributeName] === 'true';
        // Only update verified attribute the first time
        if (answerCorrect && !attributeVerified) {
          logger.debug(`Updating user attribute to verified: ${attributeName}`);
          await this.markAsVerifiedAndDeletePasswordlessAttribute(
            event.userName,
            attributeName,
            event.region,
            event.userPoolId
          );
        }
      }
    } catch (_err) {
      // best effor to parse passwordless_sign_up attribute
    }
    event.request.userAttributes[PASSWORDLESS_SIGN_UP_ATTR_NAME] === 'true';

    return verifyResult;
  };

  /**
   * Validates that the sign in method from the client is supported.
   * @param signInMethod - The sign in method provided by the client.
   * @returns A valid sign in method.
   */
  private validateSignInMethod(signInMethod?: string): SignInMethod {
    if (signInMethod !== 'MAGIC_LINK' && signInMethod !== 'OTP') {
      throw new Error(`Unrecognized signInMethod: ${signInMethod || 'Null'}`);
    }
    return signInMethod;
  }

  private async markAttributeAsVerified(
    { username, deliveryMedium, region, userPoolId }:
      { username: string, deliveryMedium: string, userPoolId: string, region: string }
  ) {
    const attributeName = deliveryMedium === 'SMS' ? "phone_number_verified" : "email_verified";
    const attributeVerified = {
      Name: attributeName,
      Value: "true"
    };

    const client = new CognitoIdentityProviderClient({ region });
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: username,
      UserAttributes: [attributeVerified],
    })

    await client.send(command);
  }

  /**
   * Validates that the action from the client is supported.
   * @param action - The action provided by the client.
   * @returns A valid action.
   */
  private validateAction(action?: string): 'REQUEST' | 'CONFIRM' {
    if (action !== 'REQUEST' && action !== 'CONFIRM') {
      throw new Error(
        `Unsupported action for Create Auth: ${action || 'Null'}`
      );
    }

    return action;
  }

  /**
   * Parses and validates the CodeDeliveryDetails out of the CreateAuthChallengeTriggerEvent.
   * Verifies that the user, delivery medium, and destination are valid.
   * @param event - The Create Auth Challenge event provided by Cognito.
   * @returns CodeDeliveryDetails if valid else throws error
   */
  private validateDeliveryCodeDetails = (
    event: CreateAuthChallengeTriggerEvent
  ): CodeDeliveryDetails => {
    const previousChallenge = event.request.session.slice(-1)[0];
    const previousDeliveryMedium: string | undefined =
      previousChallenge.challengeMetadata?.includes('deliveryMedium')
        ? JSON.parse(previousChallenge.challengeMetadata).deliveryMedium
        : undefined;
    const clientMetadata = event.request.clientMetadata || {};
    const deliveryMedium =
      clientMetadata[CognitoMetadataKeys.DELIVERY_MEDIUM] ??
      previousDeliveryMedium;

    if (deliveryMedium !== 'SMS' && deliveryMedium !== 'EMAIL') {
      throw Error(
        `Invalid delivery medium: ${deliveryMedium}. Only SMS and email are supported.`
      );
    }

    const attributeName = deliveryMedium === 'SMS' ? 'phone_number' : 'email';

    return {
      attributeName,
      deliveryMedium,
    };
  };

  /**
   * Validates and returns the destination for the code or link.
   * @param deliveryMedium - The delivery medium for the challenge.
   * @param event - The Create Auth Challenge event.
   * @returns An object that contains a boolean indicating if the destination is
   * verified, and the destination.
   */
  private validateDestination = (
    deliveryMedium: DeliveryMedium,
    event: CreateAuthChallengeTriggerEvent
  ): {
    isFirstSignInAttempt: boolean;
    isVerified: boolean;
    destination: string;
  } => {
    const {
      email,
      phone_number: phoneNumber,
      email_verified: emailVerified,
      phone_number_verified: phoneNumberVerified,
      [PASSWORDLESS_SIGN_UP_ATTR_NAME]: passwordlessSignUp,
    } = event.request.userAttributes;

    let isFirstSignInAttempt = false;
    try {
      const passwordlessConfiguration = JSON.parse(passwordlessSignUp);
      if (
        passwordlessConfiguration.allowSignInAttempt &&
        passwordlessConfiguration.deliveryMedium === deliveryMedium
      ) {
        isFirstSignInAttempt = true;
      }
    } catch (_err) {
      // best effort to parse passwordless_sign_up attribute if the user was created via passwordless sign up
    }

    if (
      deliveryMedium === 'SMS' &&
      (!phoneNumber || phoneNumberVerified !== 'true')
    ) {
      return {
        isFirstSignInAttempt,
        isVerified: false,
        destination: phoneNumber,
      };
    }
    if (deliveryMedium === 'EMAIL' && (!email || emailVerified !== 'true')) {
      return {
        isFirstSignInAttempt: isFirstSignInAttempt,
        isVerified: false,
        destination: email,
      };
    }

    return {
      isFirstSignInAttempt,
      isVerified: true,
      destination: deliveryMedium === 'SMS' ? phoneNumber : email,
    };
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

  /**
   * Counts the number of submission attempts in the event.
   * @param event - The lambda event.
   * @returns the number of attempts.
   */
  private countAttempts(event: DefineAuthChallengeTriggerEvent) {
    return event.request.session.filter(
      (entry) => !entry.challengeMetadata?.includes('PROVIDE_AUTH_PARAMETERS')
    ).length;
  }
}
