export type AuthUser = {
  username: string;
  preferredChal: string;
};

export type AuthClient = {
  createUser: (
    username: string,
    password: string,
    preferredChallenge: string
  ) => Promise<AuthUser>;
};
