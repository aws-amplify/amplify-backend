export type AuthUser = {
  username: string;
  // eslint-disable-next-line spellcheck/spell-checker
  signUpOption: 'MFA' | 'Passwordless';
  password?: string;
};

export type AuthClient = {
  createUser: (newUser: AuthUser) => Promise<AuthUser>;
  signInUser: (userToSignIn: AuthUser) => Promise<void>;
};
