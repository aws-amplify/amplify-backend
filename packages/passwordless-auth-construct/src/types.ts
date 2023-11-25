import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { Duration } from 'aws-cdk-lib/core';
import { DeleteCommandOutput } from '@aws-sdk/lib-dynamodb';

/**
 * The client meta data object provided during passwordless auth.
 */
export type PasswordlessClientMetaData =
  | RequestMagicLinkClientMetaData
  | ConfirmMagicLinkClientMetaData
  | RequestOTPClientMetaData
  | ConfirmOTPClientMetaData;

export type RequestMagicLinkClientMetaData = {
  signInMethod: 'MAGIC_LINK';
  action: 'REQUEST';
  deliveryMedium: 'EMAIL';

  /**
   * A redirect URL with a code placeholder. For example: 'https://example.com/signin?code=##code##'
   */
  redirectUri: string;
};

export type ConfirmMagicLinkClientMetaData = {
  signInMethod: 'MAGIC_LINK';
  action: 'CONFIRM';
};

export type RequestOTPClientMetaData = {
  signInMethod: 'OTP';
  action: 'REQUEST';
  deliveryMedium: DeliveryMedium;
};

export type ConfirmOTPClientMetaData = {
  signInMethod: 'OTP';
  action: 'CONFIRM';
};

export type SignInMethod = PasswordlessClientMetaData['signInMethod'];

/**
 * A service for creating and verifying challenges of a specific type. For
 * example, One Time Passwords or Magic Links.
 */
export type ChallengeService = {
  signInMethod: SignInMethod;
  createChallenge: (
    event: CreateAuthChallengeTriggerEvent
  ) => Promise<CreateAuthChallengeTriggerEvent>;
  verifyChallenge: (
    event: VerifyAuthChallengeResponseTriggerEvent
  ) => Promise<VerifyAuthChallengeResponseTriggerEvent>;
};

export type ChallengeType = 'MAGIC_LINK' | 'OTP';

/**
 * The delivery service interface.
 */
export type DeliveryService = {
  deliveryMedium: DeliveryMedium;
  /**
   * Send message via delivery service
   * @param message the message to send
   * @param destination the destination of the message
   */
  send: (
    message: string,
    destination: string,
    challengeType: ChallengeType
  ) => Promise<void>;

  /**
   * Mask a destination
   * Example: +12345678901 => +*********8901
   * @param destination The destination to mask
   * @returns The masked destination,
   */
  mask: (destination: string) => string;
};

/**
 * A service for signing chunks of data.
 */
export type SigningService = {
  /**
   * Signs the provided data.
   * @param data - The data to sign.
   * @returns The signature.
   */
  sign: (data: Uint8Array) => Promise<{ keyId: string; signature: Uint8Array }>;

  /**
   * Verifies that a signature is valid.
   * @param keyId - The ID of the key that was used to sign the data.
   * @param data - The data that was signed.
   * @param signature - The signature to verify.
   * @returns - True if the signature is valid, otherwise false.
   */
  verify: (
    keyId: string,
    data: Uint8Array,
    signature: Uint8Array
  ) => Promise<boolean>;
};

export type RemovedItem = DeleteCommandOutput['Attributes'];

/**
 * A service for storing items with conditional removal.
 */
export type StorageService<T> = {
  /**
   * Saves the item user the given ID.
   * @param id - The unique ID for the item.
   * @param item - The item to store.
   * @returns a promise that resolves when the item has been stored.
   */
  save: (id: string, item: T) => Promise<void>;

  /**
   * Removes the item from storage if it matches the expected item.
   * @param id - The unique ID for the item.
   * @param expectedItem - The expected item.
   * @returns - The item that was removed
   */
  remove: (id: string, expectedItem: T) => Promise<RemovedItem>;
};

export type PasswordlessAuthChallengeParams =
  | InitiateAuthChallengeParams
  | RespondToAutChallengeParams
  | EmptyAuthChallengeParams;

type EmptyAuthChallengeParams = { [index: string]: never };

type InitiateAuthChallengeParams = {
  nextStep: 'PROVIDE_AUTH_PARAMETERS'; //
};

type RespondToAutChallengeParams = {
  nextStep: 'PROVIDE_CHALLENGE_RESPONSE';
  codeDeliveryDetails: CodeDeliveryDetails;
};

export type CodeDeliveryDetails = {
  attributeName: 'email' | 'phone_number';
  deliveryMedium: DeliveryMedium;
  destination: string;
};

export type DeliveryMedium = 'SMS' | 'EMAIL';

/**
 * Options for passwordless authentication.
 */
export type PasswordlessAuthProps = {
  magicLink?: MagicLinkAuthOptions;
  otp?: OtpAuthOptions;
};

/**
 * Options for passwordless authentication via Magic Link.
 *
 * Passwordless authentication via Magic Link will be disabled if no options
 * provided.
 */
export type MagicLinkAuthOptions = {
  /**
   * The origins that Magic Links can contains.
   * If a client request a link that is not in this list, the request will be
   * rejected.
   */
  allowedOrigins: string[];
  /**
   * The amount of time until a Magic Link expires.
   * The maximum allowed duration is 1 hour.
   * @default Duration.minutes(15)
   */
  linkDuration?: Duration;
  /**
   * The Email options for Magic Link. Email will be enabled unless if this is false.
   * @default true
   */
  email?: MagicLinkEmailOptions | boolean;
};

/**
 * Options for passwordless authentication via OTP (One Time Password).
 *
 * Passwordless authentication via OTP will be disabled if no options
 * provided.
 */
export type OtpAuthOptions = {
  /**
   * The length of the OTP code.
   *
   * The minimum allowed length is 6.
   * @default 6
   */
  length?: number;
  /**
   * The SMS options for OTP. SMS will be disabled if this in undefined.
   */
  sms?: OtpSmsOptions;
  /**
   * The Email options for OTP. Email will be disabled if this in undefined.
   * @default false
   */
  email?: OtpEmailOptions | boolean;
};

/** Generic SMS Options that apply to all challenge types */
export type SmsOptions = {
  /**
   * The AWS SNS origination number.
   * A numeric string that identifies an SMS message sender's phone number.
   */
  originationNumber: string;
  /**
   * The AWS SNS Sender Id.
   * The name that appears as the message sender on recipients' devices.
   */
  senderId?: string;
  /**
   * The message to send to the user.
   */
  message?: string;
};

/** OTP SMS Options */
export type OtpSmsOptions = SmsOptions & {
  /**
   * The message to send to the user. "####" should be used as a placeholder for
   * the secret.
   * @default "Your verification code is: ####"
   */
  message?: string;
};

/** Generic Email Options that apply to all challenge types */
export type EmailOptions = {
  /** The from address for SES messages. */
  fromAddress?: string;
  /**
   * The subject of the email to send to the user.
   */
  subject?: string;
  /**
   * The body of the email to send to the user.
   */
  body?: string;
};

/** OTP Email Options */
export type OtpEmailOptions = EmailOptions & {
  /**
   * The subject of the email to send to the user. "####" should be used as a
   * placeholder for the OTP.
   * @default 'Your verification code'
   */
  subject?: string;

  /**
   * The body of the email to send to the user. "####" should be used as a
   * placeholder for the OTP.
   * @default 'Your verification code is: ####'
   */
  body?: string;
};

/** OTP Email Options */
export type MagicLinkEmailOptions = EmailOptions & {
  /**
   * The subject of the email to send to the user. "####" should be used as a
   * placeholder for the Magic Link.
   * @default 'Your sign-in link'
   */
  subject?: string;

  /**
   * The body of the email to send to the user. "####" should be used as a
   * placeholder for the Magic link.
   * @default '<html><body><p>Your sign-in link: <a href="####">sign in</a></p></body></html>'
   */
  body?: string;
};

export type ChallengeResult =
  CreateAuthChallengeTriggerEvent['request']['session']['0'];

export type CustomAuthTriggers = {
  defineAuthChallenge: NodejsFunction;
  createAuthChallenge: NodejsFunction;
  verifyAuthChallengeResponse: NodejsFunction;
};

/**
 * SNS Service Configuration.
 */
export type SnsServiceConfig = {
  otp: Partial<SmsOptions>;
  magicLink: Partial<SmsOptions>;
};

/**
 * SES Service Configuration.
 */
export type SesServiceConfig = {
  otp: Partial<EmailOptions>;
  magicLink: Partial<EmailOptions>;
};

/**
 * OTP Configuration.
 */
export type OtpConfig = {
  /**
   * The length of the OTP code to generate. Must be 6 or greater. Defaults to 6.
   */
  otpLength: number;
};

export type MagicLinkConfig = {
  allowedOrigins: string[];
  linkDuration: Duration;
  /** Configuration for storing magic links */
  storage: MagicLinkStorageConfig;
  /** Configuration for Key Management Service */
  kms: KmsConfig;
};

export type MagicLinkStorageConfig = {
  /** The name of the DynamoDB table where Magic Links will be stored */
  tableName?: string;
};

export type KmsConfig = {
  /** KMS Key ID to use for generating Magic Links (signatures) */
  keyId?: string;
};
