export type AuthSignUp = {
  signInAfterCreation: boolean;
  preferredSignInFlow: 'Password' | 'MFA';
  username: string;
  password?: string;
  email?: string;
  phoneNumber?: string;
  mfaPreference?: 'TOTP' | 'email' | 'SMS';
  signUpChallenge?: () => Promise<ChallengeResponse>;
};

export type AuthUser = {
  signInFlow: 'Password' | 'MFA';
  username: string;
  password?: string;
  email?: string;
  phoneNumber?: string;
  signInChallenge?: () => Promise<ChallengeResponse>;
};

export type AuthOutputs = {
  signInFlow: 'Password' | 'MFA';
  username: string;
};

export type ChallengeResponse = {
  challengeResponse: string;
};
