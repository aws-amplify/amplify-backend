import * as auth from 'aws-amplify/auth';
import assert from 'assert';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import { AuthSignUp, AuthUser } from '../types.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { PersistentPasswordFlow } from './persistent_password_flow.js';

/**
 * Handles users who enter the MFA flow
 */
export class MfaFlow {
  /**
   * Constructor for dependency injection
   */
  constructor(
    private readonly authApi = auth,
    private readonly prompter = AmplifyPrompter,
  ) {}

  /**
   * Signs up user with MFA sign up flow
   * @param user - properties to sign up user with MFA
   * @param tempPassword - temporary password that was generated for sign up
   * @returns - true if user is successfully signed up, false otherwise
   */
  mfaSignUp = async (user: AuthSignUp, tempPassword: string) => {
    assert.strictEqual(user.signInFlow, 'MFA');
    const passwordFlow = new PersistentPasswordFlow(this.authApi);
    let passwordSignIn = await passwordFlow.persistentPasswordSignUp(
      user,
      tempPassword,
    );

    if (
      passwordSignIn.nextStep.signInStep ===
      'CONTINUE_SIGN_IN_WITH_MFA_SELECTION'
    ) {
      if (!user.mfaPreference) {
        throw new AmplifyUserError('NoMFAPreferenceSpecifiedError', {
          message: `If multiple forms of MFA are enabled for a userpool, you must specify which form you intend to use for ${user.username}`,
          resolution: `Specify a form of MFA for the user, ${user.username}, to use with the mfaPreference property`,
        });
      }

      if (
        !passwordSignIn.nextStep.allowedMFATypes?.includes(user.mfaPreference)
      ) {
        throw new AmplifyUserError('MFAPreferenceNotAvailableError', {
          message: `${user.mfaPreference} is not available for this userpool`,
          resolution: `Activate ${user.mfaPreference} for this userpool or sign in ${user.username} with a different form of MFA`,
        });
      }

      passwordSignIn = await this.authApi.confirmSignIn({
        challengeResponse: user.mfaPreference,
      });
    }

    if (
      passwordSignIn.nextStep.signInStep === 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP'
    ) {
      if (!user.totpSignUpChallenge) {
        throw new AmplifyUserError('MissingTOTPChallengeError', {
          message:
            'MFA sign up flow with TOTP cannot be used without a totpSignUpChallenge',
          resolution: `Add a totpSignupChallenge when signing up ${user.username}`,
        });
      }
      const challengeOutput = await user.totpSignUpChallenge(
        passwordSignIn.nextStep.totpSetupDetails,
      );
      const challengeResponse = challengeOutput.challengeResponse;
      const totpSignIn = await this.authApi.confirmSignIn({
        challengeResponse: challengeResponse,
      });

      await this.authApi.updateMFAPreference({ totp: 'PREFERRED' });
      return totpSignIn;
    } else if (
      passwordSignIn.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE'
    ) {
      let challengeResponse: string;
      if (!user.smsSignUpChallenge) {
        challengeResponse = await this.prompter.secretValue(
          `Please input the SMS one-time password for ${user.username}:`,
        );
      } else {
        const challengeOutput = await user.smsSignUpChallenge();
        challengeResponse = challengeOutput.challengeResponse;
      }
      const smsSignIn = await this.authApi.confirmSignIn({
        challengeResponse: challengeResponse,
      });

      await this.authApi.updateMFAPreference({ sms: 'PREFERRED' });
      return smsSignIn;
    } else if (
      passwordSignIn.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE'
    ) {
      let challengeResponse: string;
      if (!user.emailSignUpChallenge) {
        challengeResponse = await this.prompter.secretValue(
          `Please input one-time password from EMAIL for ${user.username}:`,
        );
      } else {
        const challengeOutput = await user.emailSignUpChallenge();
        challengeResponse = challengeOutput.challengeResponse;
      }
      const emailSignIn = await this.authApi.confirmSignIn({
        challengeResponse: challengeResponse,
      });

      await this.authApi.updateMFAPreference({ email: 'PREFERRED' });
      return emailSignIn;
    }
    return passwordSignIn;
  };

  /**
   * Signs in user with MFA
   * @param user - properties to sign in user with MFA
   * @returns - true if user is successfully signed in, false otherwise
   */
  mfaSignIn = async (user: AuthUser) => {
    assert.strictEqual(user.signInFlow, 'MFA');
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

    if (signInResult.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
      let challengeResponse: string;
      if (!user.signInChallenge) {
        challengeResponse = await this.prompter.secretValue(
          `Please input the one-time password from your TOTP App for ${user.username}:`,
        );
      } else {
        const challengeOutput = await user.signInChallenge();
        challengeResponse = challengeOutput.challengeResponse;
      }
      const totpSignIn = await this.authApi.confirmSignIn({
        challengeResponse: challengeResponse,
      });
      return totpSignIn.nextStep.signInStep === 'DONE';
    } else if (
      signInResult.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE'
    ) {
      let challengeResponse: string;
      if (!user.signInChallenge) {
        challengeResponse = await this.prompter.secretValue(
          `Please input one-time password from SMS for ${user.username}:`,
        );
      } else {
        const challengeOutput = await user.signInChallenge();
        challengeResponse = challengeOutput.challengeResponse;
      }
      const smsSignIn = await this.authApi.confirmSignIn({
        challengeResponse: challengeResponse,
      });
      return smsSignIn.nextStep.signInStep === 'DONE';
    } else if (
      signInResult.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE'
    ) {
      let challengeResponse: string;
      if (!user.signInChallenge) {
        challengeResponse = await this.prompter.secretValue(
          `Please input one-time password from EMAIL for ${user.username}:`,
        );
      } else {
        const challengeOutput = await user.signInChallenge();
        challengeResponse = challengeOutput.challengeResponse;
      }
      const emailSignIn = await this.authApi.confirmSignIn({
        challengeResponse: challengeResponse,
      });
      return emailSignIn.nextStep.signInStep === 'DONE';
    }
    throw new AmplifyUserError('CannotSignInWithMFAError', {
      message: `${user.username} cannot be signed in with MFA`,
      resolution: `Ensure that ${user.username} exists and that MFA is set to REQUIRED.`,
    });
  };
}
