import { SNSClient } from '@aws-sdk/client-sns';
import { KMSClient } from '@aws-sdk/client-kms';
import { ChallengeServiceFactory } from '../factories/challenge_service_factory.js';
import { DeliveryServiceFactory } from '../factories/delivery_service_factory.js';
import { MagicLinkChallengeService } from '../magic-link/magic_link_challenge_service.js';
import { OtpChallengeService } from '../otp/otp_challenge_service.js';
import { SnsService } from '../services/sns_service.js';
import { CustomAuthService } from './custom_auth_service.js';
import { PasswordlessConfig } from '../common/passwordless_config.js';
import { SesService } from '../services/ses_service.js';
import { SESClient } from '@aws-sdk/client-ses';
import { KMSService } from '../services/kms_service.js';
import { MagicLinkStorageService } from '../magic-link/magic_link_storage_service.js';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const { otpConfig, magicLinkConfig, snsConfig, sesConfig } =
  new PasswordlessConfig(process.env);
const { kms, storage } = magicLinkConfig;
const deliveryServiceFactory = new DeliveryServiceFactory([
  new SnsService(new SNSClient(), snsConfig),
  new SesService(new SESClient(), sesConfig),
]);

const otpChallengeService = new OtpChallengeService(
  deliveryServiceFactory,
  otpConfig
);

const kmsService = new KMSService(new KMSClient(), kms);
const magicLinkStorageService = new MagicLinkStorageService(
  DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  }),
  storage
);

const magicLinkChallengeService = new MagicLinkChallengeService(
  deliveryServiceFactory,
  magicLinkConfig,
  kmsService,
  magicLinkStorageService
);

const challengeServiceFactory = new ChallengeServiceFactory([
  otpChallengeService,
  magicLinkChallengeService,
]);

export const { defineAuthChallenge, createAuthChallenge, verifyAuthChallenge } =
  new CustomAuthService(challengeServiceFactory);
