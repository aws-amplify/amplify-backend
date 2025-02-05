export type AuthSignUp = {
  signInAfterCreation: boolean;
  preferredSignInFlow: 'Password' | 'MFA';
  username: string;
  password?: string;
  email?: string;
  phoneNumber?: string;
  mfaPreference?: 'TOTP' | 'email' | 'SMS';
  signUpChallenge?: () => Promise<void>;
};

export type AuthUser = {
  signInFlow: 'Password' | 'MFA';
  username: string;
  password?: string;
  email?: string;
  phoneNumber?: string;
};

export type AuthOutputs = {
  signInFlow: 'Password' | 'MFA';
  username: string;
};
