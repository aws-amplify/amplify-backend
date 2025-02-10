import * as auth from 'aws-amplify/auth';

export type AuthSignUp = {
  signInAfterCreation: boolean;
  username: string;
} & (PasswordSignInFlow | MfaSignUpFlow | MfaWithTotpSignUpFlow);

export type AuthUser = {
  username: string;
} & (PasswordSignInFlow | MfaSignInFlow);

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
  email?: string;
  phoneNumber?: string;
  mfaPreference?: 'email' | 'SMS';
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
