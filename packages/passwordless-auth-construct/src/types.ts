import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';

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
  send: (message: string, destination: string) => Promise<void>;

  /**
   * Mask a destination
   * Example: +12345678901 => +*********8901
   * @param destination The destination to mask
   * @returns The masked destination,
   */
  mask: (destination: string) => string;

  /**
   * Create the message to send
   * @param secret The secret to include in the message
   * @returns The message to send
   */
  createMessage: (secret: string) => string;
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
 * Options for passwordless auth.
 */
export type PasswordlessAuthProps = {
  magicLink?: MagicLinkAuthOptions;
  otp?: OtpAuthOptions | boolean;
};

/**
 * Options for Magic Link Passwordless Auth.
 */
export type MagicLinkAuthOptions = {
  fromAddress: string;
};

/**
 * Options for OTP Passwordless Auth.
 */
export type OtpAuthOptions = {
  /**
   * The AWS SNS origination number.
   * A numeric string that identifies an SMS message sender's phone number.
   */
  originationNumber?: string;

  /**
   * The AWS SNS Sender Id.
   * The name that appears as the message sender on recipients' devices.
   */
  senderId?: string;

  /**
   * The AWS region of the SES topic.
   */
  sesRegion?: string;

  /**
   * The from address for SES messages.
   * Required for OTP via Email
   */
  fromAddress?: string;

  /**
   * The length of the OTP code.
   * @default 6 length of the code. Minimum 6.
   */
  length?: number;
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
  /**
   * The origination number to use for SMS messages. Defaults to undefined.
   */
  originationNumber?: string;
  /**
   * The sender id to use for SMS messages. Defaults to undefined.
   */
  senderId?: string;
};

/**
 * SES Service Configuration.
 */
export type SesServiceConfig = {
  /**
   * The from address to use for SES messages. Defaults to undefined.
   */
  fromAddress?: string;

  /**
   * The email subject to use for SES messages. Defaults to 'Your verification code'.
   */
  emailSubject?: string;
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
