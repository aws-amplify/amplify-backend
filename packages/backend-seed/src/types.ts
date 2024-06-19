import { V6Client } from '@aws-amplify/api-graphql';

// TODO is there a better way to bring in schema typings? It must come from customer project.
export type SeedFunction<SchemaType extends Record<any, any>> = (
  // TODO how can data client dynamically typed here?
  dataClient: V6Client<SchemaType>,
  authClient: AuthClient
) => Promise<void>;

export type AuthUser = {
  username: string;
  password: string;
};

export type AuthClient = {
  createUser: (username: string, password: string) => Promise<AuthUser>;
  executeAsUser: (
    authUser: AuthUser,
    callback: () => Promise<void>
  ) => Promise<void>;
};
