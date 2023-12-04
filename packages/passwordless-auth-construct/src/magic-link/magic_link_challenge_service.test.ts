import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { match, rejects, strictEqual } from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { DeliveryServiceFactory } from '../factories/delivery_service_factory.js';

import {
  baseEvent,
  buildCreateAuthChallengeEvent,
  buildVerifyAuthChallengeResponseEvent,
  confirmMagicLinkMetaData,
  requestMagicLinkMetaData,
} from '../mocks/challenge_events.mock.js';
import {
  DeliveryMedium,
  DeliveryService,
  MagicLinkConfig,
  SigningService,
  StorageService,
} from '../types.js';
import { MagicLinkChallengeService } from './magic_link_challenge_service.js';
import { MagicLink, SignedMagicLink } from '../models/magic_link.js';
import { Duration } from 'aws-cdk-lib';
import { redirectUriMetadataKey } from '../constants.js';

const kmsKeyId = '1234';
const mockSignature = new Uint8Array([1]);

class MockDeliveryService implements DeliveryService {
  deliveryMedium: DeliveryMedium = 'EMAIL';
  send = async () => Promise.resolve();
}

class MockKmsService implements SigningService {
  constructor(private isValid: boolean = true) {}
  public sign = async () => {
    return { signature: new Uint8Array([1]), keyId: kmsKeyId };
  };
  public verify = async () => this.isValid;
}

class MockStorageService implements StorageService<SignedMagicLink> {
  constructor(private removedItem: Partial<SignedMagicLink> | undefined) {}
  save = async () => Promise.resolve();
  remove = async () => this.removedItem;
}

const magicLinkConfig: MagicLinkConfig = {
  allowedOrigins: ['https://example.com'],
  linkDuration: Duration.minutes(15),
  storage: { tableName: 'table1' },
  kms: { keyId: kmsKeyId },
};

void describe('MagicLinkChallengeService', () => {
  let service: MagicLinkChallengeService;
  let deliveryService: DeliveryService;
  let mockKmsService: SigningService;
  let mockStorageService: StorageService<SignedMagicLink>;
  let deliveryServiceFactory: DeliveryServiceFactory;

  void beforeEach(() => {
    mockKmsService = new MockKmsService();
    mockStorageService = new MockStorageService({ keyId: kmsKeyId });
    deliveryService = new MockDeliveryService();
    deliveryServiceFactory = {
      getService: () => deliveryService,
    };
    service = new MagicLinkChallengeService(
      deliveryServiceFactory,
      magicLinkConfig,
      mockKmsService,
      mockStorageService
    );
  });

  void describe('createChallenge()', () => {
    void it('should send a message, store the link, and return and event with correct params', async () => {
      const mockSend = mock.method(deliveryService, 'send');
      const mockSave = mock.method(mockStorageService, 'save');
      const event: CreateAuthChallengeTriggerEvent =
        buildCreateAuthChallengeEvent([], {
          ...requestMagicLinkMetaData,
        });
      strictEqual(mockSend.mock.callCount(), 0);
      strictEqual(mockSave.mock.callCount(), 0);
      const newEvent = await service.createChallenge(
        { deliveryMedium: 'EMAIL', attributeName: 'email' },
        'foo@example.com',
        event
      );
      strictEqual(mockSend.mock.callCount(), 1);
      strictEqual(mockSave.mock.callCount(), 1);
      const secret = mockSend.mock.calls[0].arguments[0];
      match(secret, /^https:\/\/example.com.*\..*$/);
      strictEqual(
        newEvent.response.publicChallengeParameters['deliveryMedium'],
        'EMAIL'
      );
    });

    void it('should throw if no redirect URI is provided', async () => {
      const event: CreateAuthChallengeTriggerEvent =
        buildCreateAuthChallengeEvent([], {
          ...requestMagicLinkMetaData,
          [redirectUriMetadataKey]: '',
        });
      await rejects(
        async () =>
          service.createChallenge(
            { deliveryMedium: 'EMAIL', attributeName: 'email' },
            'foo@example.com',
            event
          ),
        Error('No redirect URI provided.')
      );
    });

    void it('should throw if the redirect URI is not in the allow list', async () => {
      const event: CreateAuthChallengeTriggerEvent =
        buildCreateAuthChallengeEvent([], {
          ...requestMagicLinkMetaData,
          [redirectUriMetadataKey]: 'https://foo.com/',
        });
      await rejects(
        async () =>
          service.createChallenge(
            { deliveryMedium: 'EMAIL', attributeName: 'email' },
            'foo@example.com',
            event
          ),
        Error(
          'Invalid redirectUri: https://foo.com not in allowed origins list.'
        )
      );
    });
  });

  void describe('verifyChallenge()', () => {
    void it('should succeed authentication if the link is valid', async () => {
      const magicLink = MagicLink.create(
        baseEvent.userPoolId,
        baseEvent.userName,
        60
      ).withSignature(mockSignature, kmsKeyId);
      const event: VerifyAuthChallengeResponseTriggerEvent =
        buildVerifyAuthChallengeResponseEvent(
          {
            ...confirmMagicLinkMetaData,
          },
          magicLink.linkFragment
        );
      const newEvent = await service.verifyChallenge(event);
      strictEqual(newEvent.response.answerCorrect, true);
    });

    void it('should fail authentication if the link is invalid', async () => {
      const isValid = false;
      const deliveryServiceFactory: DeliveryServiceFactory = {
        getService: () => deliveryService,
      };
      service = new MagicLinkChallengeService(
        deliveryServiceFactory,
        magicLinkConfig,
        new MockKmsService(isValid),
        mockStorageService
      );
      const magicLink = MagicLink.create(
        baseEvent.userPoolId,
        baseEvent.userName,
        60
      ).withSignature(mockSignature, kmsKeyId);
      const event: VerifyAuthChallengeResponseTriggerEvent =
        buildVerifyAuthChallengeResponseEvent(
          {
            ...confirmMagicLinkMetaData,
          },
          magicLink.linkFragment
        );
      const newEvent = await service.verifyChallenge(event);
      strictEqual(newEvent.response.answerCorrect, false);
    });

    void it('should fail authentication if the link is not found in storage', async () => {
      const removedItem = undefined;
      const deliveryServiceFactory: DeliveryServiceFactory = {
        getService: () => deliveryService,
      };
      service = new MagicLinkChallengeService(
        deliveryServiceFactory,
        magicLinkConfig,
        mockKmsService,
        new MockStorageService(removedItem)
      );
      const magicLink = MagicLink.create(
        baseEvent.userPoolId,
        baseEvent.userName,
        60
      ).withSignature(mockSignature, kmsKeyId);
      const event: VerifyAuthChallengeResponseTriggerEvent =
        buildVerifyAuthChallengeResponseEvent(
          {
            ...confirmMagicLinkMetaData,
          },
          magicLink.linkFragment
        );
      const newEvent = await service.verifyChallenge(event);
      strictEqual(newEvent.response.answerCorrect, false);
    });

    void it('should fail authentication if the stored does not have a key ID', async () => {
      const removedItem = {};
      const deliveryServiceFactory: DeliveryServiceFactory = {
        getService: () => deliveryService,
      };
      service = new MagicLinkChallengeService(
        deliveryServiceFactory,
        magicLinkConfig,
        mockKmsService,
        new MockStorageService(removedItem)
      );
      const magicLink = MagicLink.create(
        baseEvent.userPoolId,
        baseEvent.userName,
        60
      ).withSignature(mockSignature, kmsKeyId);
      const event: VerifyAuthChallengeResponseTriggerEvent =
        buildVerifyAuthChallengeResponseEvent(
          {
            ...confirmMagicLinkMetaData,
          },
          magicLink.linkFragment
        );
      const newEvent = await service.verifyChallenge(event);
      strictEqual(newEvent.response.answerCorrect, false);
    });

    void it('should fail authentication if the username is not correct', async () => {
      const magicLink = MagicLink.create(
        baseEvent.userPoolId,
        'incorrect-user',
        60
      ).withSignature(mockSignature, kmsKeyId);
      const event: VerifyAuthChallengeResponseTriggerEvent =
        buildVerifyAuthChallengeResponseEvent(
          {
            ...confirmMagicLinkMetaData,
          },
          magicLink.linkFragment
        );
      const newEvent = await service.verifyChallenge(event);
      strictEqual(newEvent.response.answerCorrect, false);
    });
  });

  void it('should fail authentication if the link has expired', async () => {
    const secondsUntilExpiry = -1;
    const magicLink = MagicLink.create(
      baseEvent.userPoolId,
      baseEvent.userName,
      secondsUntilExpiry
    ).withSignature(mockSignature, kmsKeyId);
    const event: VerifyAuthChallengeResponseTriggerEvent =
      buildVerifyAuthChallengeResponseEvent(
        {
          ...confirmMagicLinkMetaData,
        },
        magicLink.linkFragment
      );
    const newEvent = await service.verifyChallenge(event);
    strictEqual(newEvent.response.answerCorrect, false);
  });
});
