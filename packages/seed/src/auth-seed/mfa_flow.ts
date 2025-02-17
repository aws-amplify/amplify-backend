import * as auth from 'aws-amplify/auth';
import assert from 'assert';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import { AuthSignUp, AuthUser } from '../types.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';

/**
 * Signs up user with MFA sign up flow
 * @param user - properties to sign up user with MFA
 * @param tempPassword - temporary password that was generated for sign up
 * @returns - true if user is successfully signed up, false otherwise
 */
export const mfaSignUp = async (user: AuthSignUp, tempPassword: string) => {
  assert.strictEqual(user.signInFlow, 'MFA');
  const signInResult = await auth.signIn({
    username: user.username,
    password: tempPassword,
  });

  assert.strictEqual(
    signInResult.nextStep.signInStep,
    'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
  );

  let passwordSignIn = await auth.confirmSignIn({
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

  if (
    passwordSignIn.nextStep.signInStep === 'CONTINUE_SIGN_IN_WITH_MFA_SELECTION'
  ) {
    if (!user.mfaPreference) {
      throw new AmplifyUserError('NoMFAPreferenceSpecifiedError', {
        message: `If multiple forms of MFA are enabled for a userpool, you must specify which form you intend to use for ${user.username}`,
        resolution: `Specify a form of MFA for the user, ${user.username}, to use with the mfaPreference property`,
      });
    }
    passwordSignIn = await auth.confirmSignIn({
      challengeResponse: user.mfaPreference,
    });
  }

  if (
    passwordSignIn.nextStep.signInStep === 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP'
  ) {
    assert.strictEqual(user.signUpChallenge, true);
    const challengeOutput = await user.signUpChallenge(
      passwordSignIn.nextStep.totpSetupDetails
    );
    const challengeResponse = challengeOutput.challengeResponse;
    const totpSignIn = await auth.confirmSignIn({
      challengeResponse: challengeResponse,
    });

    await auth.updateMFAPreference({ totp: 'PREFERRED' });
    return totpSignIn.nextStep.signInStep === 'DONE';
  } else if (
    passwordSignIn.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE'
  ) {
    let challengeResponse: string;
    if (!user.signUpChallenge) {
      challengeResponse = await AmplifyPrompter.input({
        message: `Please input the SMS one-time password for ${user.username}:`,
      });
    } else {
      assert.strictEqual(user.mfaPreference, 'SMS');
      const challengeOutput = await user.signUpChallenge();
      challengeResponse = challengeOutput.challengeResponse;
    }
    const smsSignIn = await auth.confirmSignIn({
      challengeResponse: challengeResponse,
    });

    await auth.updateMFAPreference({ sms: 'PREFERRED' });
    return smsSignIn.nextStep.signInStep === 'DONE';
  } else if (
    passwordSignIn.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE'
  ) {
    let challengeResponse: string;
    if (!user.signUpChallenge) {
      challengeResponse = await AmplifyPrompter.input({
        message: `Please input one-time password from EMAIL for ${user.username}:`,
      });
    } else {
      assert.strictEqual(user.mfaPreference, 'EMAIL');
      const challengeOutput = await user.signUpChallenge();
      challengeResponse = challengeOutput.challengeResponse;
    }
    const emailSignIn = await auth.confirmSignIn({
      challengeResponse: challengeResponse,
    });

    await auth.updateMFAPreference({ email: 'PREFERRED' });
    return emailSignIn.nextStep.signInStep === 'DONE';
  }
  // unsure what to do with this
  return true;
};

/**
 * Signs in user with MFA
 * @param user - properties to sign in user with MFA
 * @returns - true if user is successfully signed in, false otherwise
 */
export const mfaSignIn = async (user: AuthUser) => {
  assert.strictEqual(user.signInFlow, 'MFA');
  const signInResult = await auth.signIn({
    username: user.username,
    password: user.password,
  });

  if (signInResult.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
    let challengeResponse: string;
    if (!user.signInChallenge) {
      challengeResponse = await AmplifyPrompter.input({
        message: `Please input the one-time password from your TOTP App for ${user.username}:`,
      });
    } else {
      const challengeOutput = await user.signInChallenge();
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
    if (!user.signInChallenge) {
      challengeResponse = await AmplifyPrompter.input({
        message: `Please input one-time password from SMS for ${user.username}:`,
      });
    } else {
      const challengeOutput = await user.signInChallenge();
      challengeResponse = challengeOutput.challengeResponse;
    }
    const smsSignIn = await auth.confirmSignIn({
      challengeResponse: challengeResponse,
    });
    return smsSignIn.nextStep.signInStep === 'DONE';
  } else if (
    signInResult.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE'
  ) {
    let challengeResponse: string;
    if (!user.signInChallenge) {
      challengeResponse = await AmplifyPrompter.input({
        message: `Please input one-time password from EMAIL for ${user.username}:`,
      });
    } else {
      const challengeOutput = await user.signInChallenge();
      challengeResponse = challengeOutput.challengeResponse;
    }
    const emailSignIn = await auth.confirmSignIn({
      challengeResponse: challengeResponse,
    });
    return emailSignIn.nextStep.signInStep === 'DONE';
  } /*else {
    throw new AmplifyUserError('CannotSignInWithMFAError', {
      message: `${user.username} cannot be signed in with MFA`,
      resolution: `Ensure that ${user.username} exists and has been created with the MFA flow.`,
    });
  }*/
  return false;
};
