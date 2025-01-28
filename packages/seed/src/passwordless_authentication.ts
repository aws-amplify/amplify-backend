/* eslint-disable */
import * as auth from 'aws-amplify/auth';
import { AmplifyPrompter } from '@aws-amplify/cli-core';

export const passwordlessSignUp = async (username: string) => {
  console.log('email auth flow');
  const signInNextStep = await auth.signIn({
    username: username,
    options: {
      authFlowType: 'USER_AUTH',
      preferredChallenge: 'EMAIL_OTP',
    },
  });

  if (
    signInNextStep.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE'
  ) {
    //eslint-disable-next-line no-console
    console.log('Attempting to confirm email');
    const challengeResponse = await AmplifyPrompter.input({
      message: `Input a challenge response for ${username}: `,
    });

    const confirmSignIn = await auth.confirmSignIn({
      challengeResponse: challengeResponse,
    });

    if (confirmSignIn.nextStep.signInStep === 'DONE') {
      //eslint-disable-next-line no-console
      console.log('Sign in successful');
    }
  }
  /* one of my failed attempts at implementing passkeys
  const signInResult = await auth.signIn({
    username: username,
    options: {
      authFlowType: 'USER_AUTH',
      preferredChallenge: 'WEB_AUTHN',
    },
  });
  console.log(signInResult.nextStep.signInStep);

  if (
    signInResult.nextStep.signInStep ===
    'CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION'
  ) {
    const confirmSignIn = await auth.confirmSignIn({
      challengeResponse: 'PASSWORD',
    });
    console.log(confirmSignIn.nextStep.signInStep);

    const pwSignIn = await auth.signIn({
      username,
      password: temporaryPassword,
    });
    console.log(pwSignIn.nextStep.signInStep);
    if (
      pwSignIn.nextStep.signInStep ===
      'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
    ) {
      const confirmPW = await auth.confirmSignIn({
        challengeResponse: password,
      });
      console.log(confirmPW.nextStep.signInStep);
      console.log('associating web auth credential...');
      await auth.associateWebAuthnCredential();

      const confirmSignIn = await auth.confirmSignIn({
        challengeResponse: 'WEB_AUTHN',
      });
      console.log(confirmSignIn.nextStep.signInStep);
    }
  }*/
  //return undefined;
};
