import * as auth from 'aws-amplify/auth';
import assert from 'assert';
import { AuthSignUp } from '../types.js';

export type PersistentPasswordSignUpProps = Pick<
  AuthSignUp,
  'username' | 'password'
> & {
  tempPassword: string;
};

/**
 * Signs up user with persistent password sign up flow
 * @param signUpProps - properties for signing up a user with persistent password flow
 * @returns - true if user makes it through the sign up flow, false otherwise
 */
export const persistentPasswordSignUp = async (
  signUpProps: PersistentPasswordSignUpProps
) => {
  const signInResult = await auth.signIn({
    username: signUpProps.username,
    password: signUpProps.tempPassword,
  });

  assert.strictEqual(
    signInResult.nextStep.signInStep,
    'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
  );

  const confirmResult = await auth.confirmSignIn({
    challengeResponse: signUpProps.password!,
  });

  return confirmResult.nextStep.signInStep === 'DONE';
};
