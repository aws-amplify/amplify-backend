import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { logger } from '../logger.js';

import { MagicLink, SignedMagicLink } from '../models/magic_link.js';
import {
  ChallengeService,
  CodeDeliveryDetails,
  MagicLinkConfig,
  RespondToAutChallengeParams,
  SigningService,
  StorageService,
} from '../types.js';
import { DeliveryServiceFactory } from '../factories/delivery_service_factory.js';
import { CognitoMetadataKeys } from '../constants.js';

/**
 * Magic Link Challenge Service Implementation.
 */
export class MagicLinkChallengeService implements ChallengeService {
  /**
   * Creates a new MagicLinkChallengeService instance.
   * @param deliveryServiceFactory - A factory that provides delivery services.
   * @param config - The config for the service.
   * @param signingService - The service used to sign links.
   * @param storageService - the service used to store links.
   */
  constructor(
    private deliveryServiceFactory: DeliveryServiceFactory,
    private config: MagicLinkConfig,
    private signingService: SigningService,
    private storageService: StorageService<SignedMagicLink>
  ) {}
  public readonly signInMethod = 'MAGIC_LINK';
  public readonly maxAttempts = 1;

  /**
   * Validates that the event has any Magic Link specific data. An exception is
   * thrown if the event is not valid.
   * @param event - The Create Auth Challenge event.
   */
  public validateCreateAuthChallengeEvent = (
    event: CreateAuthChallengeTriggerEvent
  ): void => {
    this.validateRedirectUri(event.request);
  };

  /**
   * Create Magic Link challenge
   * Steps:
   * 1. Validate redirect URI
   * 2. Generate and sign magic link
   * 3. Save magic link to storage
   * 3. Send Message
   * 4. Return new event response with delivery details
   * @param deliveryDetails - The validated deliveryDetails for this challenge.
   * @param destination - The validated destination for this challenge.
   * @param event - The Create Auth Challenge event provided by Cognito.
   * @returns CreateAuthChallengeTriggerEvent with delivery details
   */
  public createChallenge = async (
    deliveryDetails: CodeDeliveryDetails,
    destination: string,
    event: CreateAuthChallengeTriggerEvent
  ): Promise<CreateAuthChallengeTriggerEvent> => {
    logger.info('Starting Create Challenge for Magic Link');
    const redirectUri = this.validateRedirectUri(event.request);

    logger.info('Creating Magic Link');
    const userId = event.request.userAttributes.sub;
    const { userName: username, userPoolId } = event;
    const { linkDuration } = this.config;
    const magicLink = MagicLink.create(
      userPoolId,
      username,
      linkDuration.toSeconds()
    );
    const { signatureData } = magicLink;

    logger.info('Signing Magic Link');
    const { keyId, signature } = await this.signingService.sign(signatureData);
    const signedMagicLink = magicLink.withSignature(signature, keyId);
    logger.debug(`Signed link with Key ID: ${keyId}`);

    logger.info('Saving Magic Link');
    await this.storageService.save(userId, signedMagicLink);

    logger.info('Sending Magic Link');
    const fullRedirectUri = signedMagicLink.generateRedirectUri(redirectUri);
    const { deliveryMedium } = deliveryDetails;
    await this.deliveryServiceFactory
      .getService(deliveryMedium)
      .send(fullRedirectUri, destination, this.signInMethod);

    const publicChallengeParameters: RespondToAutChallengeParams = {
      nextStep: 'PROVIDE_CHALLENGE_RESPONSE',
      ...event.response.publicChallengeParameters,
      ...deliveryDetails,
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
  };

  /**
   * Verify Magic Link challenge answer
   *
   * Steps:
   * 1. Create a magic link from the provided secret
   * 2. Validate the username and expiration of the provided link
   * 3. Fetch/remove magic link from storage
   * 4. Verify link signature
   * 3. Return response based on signature verification
   * @param event - The Verify Auth Challenge event provided by Cognito.
   * @returns VerifyAuthChallengeResponseTriggerEvent with answerCorrect
   */
  public verifyChallenge = async (
    event: VerifyAuthChallengeResponseTriggerEvent
  ): Promise<VerifyAuthChallengeResponseTriggerEvent> => {
    logger.info('Starting Verify Challenge for Magic Link');
    const failChallenge = (reason: string) => {
      logger.info(reason);
      return {
        ...event,
        response: {
          answerCorrect: false,
        },
      };
    };

    const magicLink = SignedMagicLink.fromLinkFragment(
      event.request.challengeAnswer,
      event.userPoolId
    );

    const { username, signatureData, signature, isExpired } = magicLink;

    if (username != event.userName) {
      return failChallenge('Magic Link belongs to a different user');
    }

    if (isExpired) {
      return failChallenge('The link has expired');
    }

    const userId = event.request.userAttributes.sub;

    logger.info('Fetching/Removing Magic Link');
    const removedItem = await this.storageService.remove(userId, magicLink);
    if (!removedItem || !removedItem.keyId) {
      return failChallenge('Either no link was found or the link is invalid');
    }

    logger.info('Verifying Magic Link');
    const isValid = await this.signingService.verify(
      removedItem.keyId,
      signatureData,
      signature
    );

    logger.info(`Magic link is valid: ${JSON.stringify(isValid)}`);
    const response: VerifyAuthChallengeResponseTriggerEvent = {
      ...event,
      response: {
        answerCorrect: isValid,
      },
    };
    logger.debug(JSON.stringify(response, null, 2));
    return response;
  };

  private validateRedirectUri = (
    request: CreateAuthChallengeTriggerEvent['request']
  ): string => {
    const { allowedOrigins } = this.config;
    const clientMetadata = request.clientMetadata || {};
    const redirectUri = clientMetadata[CognitoMetadataKeys.REDIRECT_URI];
    if (!redirectUri) {
      throw new Error('No redirect URI provided.');
    }
    const origin = new URL(redirectUri).origin;
    if (!allowedOrigins.includes(origin)) {
      logger.debug(
        `${origin} not in allowed origins: ${allowedOrigins.join(', ')}`
      );
      throw new Error(
        `Invalid redirectUri: ${origin} not in allowed origins list.`
      );
    }
    return redirectUri;
  };
}
