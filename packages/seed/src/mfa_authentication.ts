import * as auth from 'aws-amplify/auth';
import { AmplifyPrompter } from '@aws-amplify/cli-core';

/**
 * sign up flow for MFA
 */
export const mfaSignUp = async (
  username: string,
  temporaryPassword: string,
  password: string
) => {
  //MFA TOTP works, sms and email have simpler flows
  //https://docs.amplify.aws/react/build-a-backend/auth/concepts/multi-factor-authentication/#multi-factor-authentication-with-totp
  const signInResult = await auth.signIn({
    username,
    password: temporaryPassword,
  });

  if (
    signInResult.nextStep.signInStep ===
    'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
  ) {
    const result = await auth.confirmSignIn({
      challengeResponse: password,
    });
    //eslint-disable-next-line no-console
    console.log(result.nextStep.signInStep);

    if (result.nextStep.signInStep === 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP') {
      //TO DO: give the option to pass in app name so people can scan QR code instead of inputting secret
      //const secretCode = result.nextStep.totpSetupDetails.sharedSecret;

      //this is somewhat more useful if your Authenticator app is on your laptop
      const setupDetails = result.nextStep.totpSetupDetails;
      //eslint-disable-next-line spellcheck/spell-checker
      const appName = 'passwordless-testing';
      const setupURi = setupDetails.getSetupUri(appName);
      //eslint-disable-next-line no-console
      console.log(setupURi.toString());

      //eslint-disable-next-line no-console
      //console.log(`Connect your preferred Authenticator App: ${secretCode}`);
      const challengeResponse = await AmplifyPrompter.input({
        message: `Input a challenge response for ${username}: `,
      });
      const totp = await auth.confirmSignIn({
        challengeResponse: challengeResponse,
      });
      //eslint-disable-next-line no-console
      console.log(totp.nextStep.signInStep);
    }
  }
};
