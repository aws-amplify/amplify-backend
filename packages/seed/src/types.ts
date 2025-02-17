import * as auth from 'aws-amplify/auth';

export type AuthSignUp = {
  signInAfterCreation: boolean;
  username: string;
  userAttributes?: StandardUserAttributes;
} & (PasswordSignInFlow | MfaSignUpFlow | MfaWithTotpSignUpFlow);

export type AuthUser = {
  username: string;
} & (PasswordSignInFlow | MfaSignInFlow);

export type AuthUserGroupInput = {
  username: string;
};

export type AuthOutputs = {
  signInFlow: 'Password' | 'MFA';
  username: string;
};

export type ChallengeResponse = {
  challengeResponse: string;
};

export type PasswordSignInFlow = {
  signInFlow: 'Password';
  password: string;
};

export type MfaSignUpFlow = {
  signInFlow: 'MFA';
  password: string;
  mfaPreference?: 'EMAIL' | 'SMS';
  signUpChallenge?: () => Promise<ChallengeResponse>;
};

export type MfaWithTotpSignUpFlow = {
  signInFlow: 'MFA';
  password: string;
  mfaPreference?: 'TOTP';
  signUpChallenge: (
    totpSetup: auth.SetUpTOTPOutput
  ) => Promise<ChallengeResponse>;
};

export type MfaSignInFlow = {
  signInFlow: 'MFA';
  password: string;
  email?: string;
  phoneNumber?: string;
  signInChallenge?: () => Promise<ChallengeResponse>;
};

// Standard User Attributes come from here: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#cognito-user-pools-standard-attributes
// Types come from here (address is typed as string here instead of JSON Object): https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
export type StandardUserAttributes = {
  name?: string;
  familyName?: string;
  givenName?: string;
  middleName?: string;
  nickname?: string;
  preferredUsername?: string;
  profile?: string;
  picture?: string;
  website?: string;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  updatedAt?: string;
  address?: string;
  email?: string;
  phoneNumber?: string;
  sub?: string;
};
