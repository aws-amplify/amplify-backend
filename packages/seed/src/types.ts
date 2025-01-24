export type AuthUser = {
  username: string;
  password: string;
};

export type AuthClient = {
  createUser: (username: string, password: string) => Promise<AuthUser>;
};
