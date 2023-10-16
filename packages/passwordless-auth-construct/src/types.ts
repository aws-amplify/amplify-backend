import { CreateAuthChallengeTriggerEvent } from 'aws-lambda';

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
  deliveryMedium: 'SMS' | 'EMAIL';
};

export type ConfirmOTPClientMetaData = {
  signInMethod: 'OTP';
  action: 'CONFIRM';
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

type CodeDeliveryDetails = {
  attributeName: 'email' | 'phone_number';
  deliveryMedium: 'EMAIL' | 'SMS';
  destination: string;
};

/**
 * Options for passwordless auth.
 */
export type PasswordlessAuthProps = {
  magicLink?: MagicLinkAuthOptions;
};

/**
 * Options for Magic Link Passwordless Auth.
 */
export type MagicLinkAuthOptions = {
  fromAddress: string;
};

export type ChallengeResult =
  CreateAuthChallengeTriggerEvent['request']['session']['0'];
