import * as auth from 'aws-amplify/auth';
import assert from 'assert';
import { AuthSignUp } from '../types.js';

/**
 * Signs up user with persistent password sign up flow
 * @param user - properties for signing up a user with persistent password flow
 * @param tempPassword - temporary password used generated for sign up
 * @returns - true if user makes it through the sign up flow, false otherwise
 */
export const persistentPasswordSignUp = async (
  user: AuthSignUp,
  tempPassword: string,
  authApi: typeof auth
) => {
  const signInResult = await authApi.signIn({
    username: user.username,
    password: tempPassword,
  });

  assert.strictEqual(
    signInResult.nextStep.signInStep,
    'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
  );

  const confirmResult = await authApi.confirmSignIn({
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

  return confirmResult.nextStep.signInStep === 'DONE';
};
