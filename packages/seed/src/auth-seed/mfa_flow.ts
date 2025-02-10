import * as auth from 'aws-amplify/auth';
import assert from 'assert';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import { AuthSignUp, AuthUser } from '../types.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';

export type MfaSignUpProps = Pick<
  AuthSignUp,
  'username' | 'password' | 'mfaPreference' | 'signUpChallenge'
> & {
  tempPassword: string;
};

export type MfaSignInProps = Pick<
  AuthUser,
  'username' | 'password' | 'signInChallenge'
>;

/**
 * Signs up user with MFA sign up flow
 * @param signUpProps - properties to sign up user with MFA
 * @returns - true if user is successfully signed up, false otherwise
 */
export const mfaSignUp = async (signUpProps: MfaSignUpProps) => {
  const signInResult = await auth.signIn({
    username: signUpProps.username,
    password: signUpProps.tempPassword,
  });

  assert.strictEqual(
    signInResult.nextStep.signInStep,
    'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
  );
  const passwordSignIn = await auth.confirmSignIn({
    challengeResponse: signUpProps.password!,
  });

  if (
    passwordSignIn.nextStep.signInStep === 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP'
  ) {
    //we either use callback or we make them input with CLI
    let challengeResponse: string;
    if (!signUpProps.signUpChallenge) {
      throw new AmplifyUserError('MissingChallengeCallbackError', {
        message:
          'Users created with the TOTP sign up flow must have a challenge callback',
        resolution: `Specify a challenge callback using the signUpChallenge property for ${signUpProps.username}`,
      });
    } else {
      const challengeOutput = await signUpProps.signUpChallenge(
        passwordSignIn.nextStep.totpSetupDetails
      );
      challengeResponse = challengeOutput.challengeResponse;
    }
    const totpSignIn = await auth.confirmSignIn({
      challengeResponse: challengeResponse,
    });

    await auth.updateMFAPreference({ totp: 'PREFERRED' });
    return totpSignIn.nextStep.signInStep === 'DONE';
  } else if (
    passwordSignIn.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE'
  ) {
    // need to test this somehow
    let challengeResponse: string;
    if (!signUpProps.signUpChallenge) {
      challengeResponse = await AmplifyPrompter.input({
        message: `Please input the SMS one-time password for ${signUpProps.username}:`,
      });
    } else {
      const challengeOutput = await signUpProps.signUpChallenge();
      challengeResponse = challengeOutput.challengeResponse;
    }
    const smsSignIn = await auth.confirmSignIn({
      challengeResponse: challengeResponse,
    });

    await auth.updateMFAPreference({ sms: 'PREFERRED' });
    return smsSignIn.nextStep.signInStep === 'DONE';
  }
  // unsure what to do with this
  return true;
};

/**
 * Signs in user with MFA
 * @param signInProps - properties to sign in user with MFA
 * @returns - true if user is successfully signed in, false otherwise
 */
export const mfaSignIn = async (signInProps: MfaSignInProps) => {
  const signInResult = await auth.signIn({
    username: signInProps.username,
    password: signInProps.password,
  });

  if (signInResult.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
    let challengeResponse: string;
    if (!signInProps.signInChallenge) {
      challengeResponse = await AmplifyPrompter.input({
        message: `Please input the one-time password from your TOTP App for ${signInProps.username}:`,
      });
    } else {
      const challengeOutput = await signInProps.signInChallenge();
      challengeResponse = challengeOutput.challengeResponse;
    }
    const totpSignIn = await auth.confirmSignIn({
      challengeResponse: challengeResponse,
    });
    return totpSignIn.nextStep.signInStep === 'DONE';
  } else if (
    signInResult.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE'
  ) {
    let challengeResponse: string;
    if (!signInProps.signInChallenge) {
      challengeResponse = await AmplifyPrompter.input({
        message: `Please input the SMS one-time password for ${signInProps.username}:`,
      });
    } else {
      const challengeOutput = await signInProps.signInChallenge();
      challengeResponse = challengeOutput.challengeResponse;
    }
    const smsSignIn = await auth.confirmSignIn({
      challengeResponse: challengeResponse,
    });
    return smsSignIn.nextStep.signInStep === 'DONE';
  }
  //currently email is not supported
  return true; // should actually return signInResult
};
