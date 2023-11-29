import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { logger } from '../logger.js';

import { MagicLink, SignedMagicLink } from '../models/magic_link.js';
import {
  ChallengeService,
  MagicLinkConfig,
  SigningService,
  StorageService,
} from '../types.js';
import { DeliveryServiceFactory } from '../factories/delivery_service_factory.js';
import { validateDeliveryCodeDetails } from '../common/validate_delivery_code_details.js';

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

  public createChallenge = async (
    event: CreateAuthChallengeTriggerEvent
  ): Promise<CreateAuthChallengeTriggerEvent> => {
    logger.info('Starting Create Challenge for Magic Link');
    // validate redirect URI and delivery details
    const redirectUri = this.validateRedirectUri(event.request);
    const { deliveryMedium, destination } = validateDeliveryCodeDetails(event);
    logger.debug(
      `Delivery medium: ${deliveryMedium}, destination: ${destination}`
    );
    const deliveryService =
      this.deliveryServiceFactory.getService(deliveryMedium);

    // create magic link
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

    // sign Magic Link
    logger.info('Signing Magic Link');
    const { keyId, signature } = await this.signingService.sign(signatureData);
    const signedMagicLink = magicLink.withSignature(signature, keyId);
    logger.debug(`Signed link with Key ID: ${keyId}`);

    // save magic link to dynamo
    logger.info('Saving Magic Link');
    await this.storageService.save(userId, signedMagicLink);

    // send message
    logger.info('Sending Magic Link');
    const fullRedirectUri = signedMagicLink.generateRedirectUri(redirectUri);
    await deliveryService.send(fullRedirectUri, destination, this.signInMethod);

    // return response with masked email/phone
    const response: CreateAuthChallengeTriggerEvent = {
      ...event,
      response: {
        ...event.response,
        publicChallengeParameters: {
          ...event.response.publicChallengeParameters,
          destination: deliveryService.mask(destination),
          deliveryMedium: deliveryMedium,
        },
      },
    };

    logger.debug(JSON.stringify(response, null, 2));
    return response;
  };

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
    const redirectUri = request.clientMetadata?.redirectUri;
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
