import { AuthClient } from './auth_client.js';
import {
  AuthOutputs,
  AuthSignUp,
  AuthUser,
  AuthUserGroupInput,
} from '../types.js';
import { ConfigReader } from './config_reader.js';

const authClient = new AuthClient(new ConfigReader());

/**
 * Creates and signs up a new user
 * This API cannot be called concurrently with itself, other seed APIs, or APIs from AmplifyJS Auth.
 * You must ensure this this API is synchronized and you wait for it to complete before using other seed or Amplify Auth APIs.
 * @param newUser - contains properties required to create new user
 * @returns - Username and Sign up flow used by the new user
 */
export const createAndSignUpUser = async (
  newUser: AuthSignUp,
): Promise<AuthOutputs> => {
  return await authClient.createAndSignUpUser(newUser);
};

/**
 * Adds a user to a group
 * @param user - user to add to a group
 * @param group - group to add the user to
 * @returns - Username and Sign up flow used by this user
 */
export const addToUserGroup = async (
  user: AuthUserGroupInput,
  group: string,
): Promise<void> => {
  return await authClient.addToUserGroup(user, group);
};

/**
 * Signs in a user
 * This API cannot be called concurrently with itself, other seed APIs, or APIs from AmplifyJS Auth.
 * You must ensure this this API is synchronized and you wait for it to complete before using other seed or Amplify Auth APIs.
 * You must ensure any calls to data and storage that you make happen between signInUser and auth.signOut calls.
 * @param user - user to sign in
 * @returns - true if user was successfully signed in, false otherwise
 */
export const signInUser = async (user: AuthUser): Promise<boolean> => {
  return await authClient.signInUser(user);
};
