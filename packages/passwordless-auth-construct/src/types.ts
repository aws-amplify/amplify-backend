import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { Duration } from 'aws-cdk-lib/core';

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
    challengeType: SignInMethod
  ) => Promise<void>;
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
  remove: (id: string, expectedItem: T) => Promise<Partial<T> | undefined>;
};

export type PasswordlessAuthChallengeParams =
  | InitiateAuthChallengeParams
  | RespondToAutChallengeParams
  | EmptyAuthChallengeParams;

type EmptyAuthChallengeParams = { [index: string]: never };

type InitiateAuthChallengeParams = {
  nextStep: 'PROVIDE_AUTH_PARAMETERS';
};

type RespondToAutChallengeParams = Pick<
  CodeDeliveryDetails,
  'attributeName' | 'deliveryMedium'
> & {
  nextStep: 'PROVIDE_CHALLENGE_RESPONSE';
};

export type CodeDeliveryDetails = {
  attributeName: 'email' | 'phone_number';
  deliveryMedium: DeliveryMedium;
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
   * The Email options for Magic Link. Email will be enabled unless set to false.
   * @default true
   */
  email?: EmailOptions;
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
   * The SMS options for One Time Password. One Time Password via SMS will be
   * disabled unless defined.
   */
  sms?: SmsOptions;
  /**
   * The Email options for One Time Password.
   *
   * One Time Password via email will be disabled unless defined.
   * One Time Password via email will be enabled with default options when set
   * to true.
   * @default false
   */
  email?: EmailOptions;
};

/** Options for sending a passwordless challenge via SMS */
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
   * The message to send to the user. "####" should be used as a
   * placeholder for the generated secret.
   * @default (One Time Password): "Your verification code is: ####"
   */
  message?: string;
};

/** Options for sending a passwordless challenge via email */
export type EmailOptions = {
  /** The from address for SES messages. */
  fromAddress: string;
  /**
   * The subject of the email to send to the user.
   *
   * The Default value will depend on the challenge type.
   * @default (One Time Password): 'Your verification code
   * @default (Magic Link): 'Your sign-in link'
   */
  subject?: string;
  /**
   * The body of the email to send to the user. "####" should be used as a
   * placeholder for the generated secret.
   *
   * The Default value will depend on the challenge type.
   * @default (One Time Password): 'Your verification code is: ####'
   * @default (Magic Link): '<html><body><p>Your sign-in link: <a href="####">sign in</a></p></body></html>'
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
 * SmsOptions with params that have default values set as required. This
 * represents the options that will be defined if this delivery method is
 * enabled.
 */
export type SmsConfigOptions = SmsOptions &
  Required<Pick<SmsOptions, 'message'>>;

/**
 * EmailOptions with params that have default values set as required. This
 * represents the options that will be defined if this delivery method is
 * enabled.
 */
export type EmailConfigOptions = EmailOptions &
  Required<Pick<EmailOptions, 'subject' | 'body'>>;

/**
 * SNS Service Configuration.
 */
export type SnsServiceConfig = {
  otp?: SmsConfigOptions;
};

/**
 * SES Service Configuration.
 */
export type SesServiceConfig = {
  otp?: EmailConfigOptions;
  magicLink?: EmailConfigOptions;
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
