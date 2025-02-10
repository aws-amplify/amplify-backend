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
  tempPassword: string
) => {
  const signInResult = await auth.signIn({
    username: user.username,
    password: tempPassword,
  });

  assert.strictEqual(
    signInResult.nextStep.signInStep,
    'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
  );

  const confirmResult = await auth.confirmSignIn({
    challengeResponse: user.password,
  });

  return confirmResult.nextStep.signInStep === 'DONE';
};
