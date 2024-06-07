import { AuthClient, AuthUser } from './types.js';

export class DefaultAuthClient implements AuthClient {
  createUser = async (
    username: string,
    password: string
  ): Promise<AuthUser> => {
    console.log(`creating ${username}, ${password}`);
    return {
      username,
      password,
    };
  };
}
