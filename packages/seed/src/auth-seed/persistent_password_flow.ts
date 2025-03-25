import * as auth from 'aws-amplify/auth';
import assert from 'assert';
import { AuthSignUp, AuthUser } from '../types.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';

/**
 * Handles users who enter Persistent Password flow
 */
export class PersistentPasswordFlow {
  /**
   * constructor
   */
  constructor(private readonly authApi = auth) {}

  /**
   * Signs up user with persistent password sign up flow
   * @param user - properties for signing up a user with persistent password flow
   * @param tempPassword - temporary password used generated for sign up
   * @returns - true if user makes it through the sign up flow, false otherwise
   */
  persistentPasswordSignUp = async (user: AuthSignUp, tempPassword: string) => {
    const signInResult = await this.authApi.signIn({
      username: user.username,
      password: tempPassword,
    });

    assert.strictEqual(
      signInResult.nextStep.signInStep,
      'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
    );

    const confirmResult = await this.authApi.confirmSignIn({
      challengeResponse: user.password,
      options: {
        userAttributes: {
          name: user.userAttributes?.name,
          family_name: user.userAttributes?.familyName,
          given_name: user.userAttributes?.givenName,
          middle_name: user.userAttributes?.middleName,
          nickname: user.userAttributes?.nickname,
          preferred_username: user.userAttributes?.preferredUsername,
          profile: user.userAttributes?.profile,
          picture: user.userAttributes?.picture,
          website: user.userAttributes?.website,
          gender: user.userAttributes?.gender,
          birthdate: user.userAttributes?.birthdate,
          zoneinfo: user.userAttributes?.zoneinfo,
          locale: user.userAttributes?.locale,
          updated_at: user.userAttributes?.updatedAt,
          address: user.userAttributes?.address,
          email: user.userAttributes?.email,
          phone_number: user.userAttributes?.phoneNumber,
          sub: user.userAttributes?.sub,
        },
      },
    });

    return confirmResult;
  };

  /**
   * Signs in user with password
   * @param user - properties to sign in user with password
   * @returns - true if user is successfully signed in, false otherwise
   */
  persistentPasswordSignIn = async (user: AuthUser) => {
    let signInResult: auth.SignInOutput;
    try {
      signInResult = await this.authApi.signIn({
        username: user.username,
        password: user.password,
      });
    } catch (err) {
      const error = err as Error;
      if (error.name === 'UserNotFoundException') {
        throw new AmplifyUserError(
          'UserExistsError',
          {
            message: `${user.username} does not exist`,
            resolution: `Create a user called ${user.username}`,
          },
          error,
        );
      } else {
        throw err;
      }
    }

    return signInResult.nextStep.signInStep === 'DONE';
  };
}
