/* eslint-disable */
import { AsyncLock } from './async_lock.js';
import { AuthClient, AuthUser } from './types.js';
import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
  StartWebAuthnRegistrationCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { randomUUID } from 'node:crypto';
import { ClientConfigVersionTemplateType } from '@aws-amplify/client-config';
import * as auth from 'aws-amplify/auth';
//import assert from 'assert';
import { AmplifyPrompter } from '@aws-amplify/cli-core';

// Took the skeleton of this from the initial Seed POC
export class DefaultAuthClient implements AuthClient {
  /**
   * Asynchronous lock is used to assure that all calls to Amplify JS library are
   * made in single transaction. This is because that library maintains global state,
   * for example auth session.
   */
  // TODO setting timeout makes node process delay exit until that promise resolves, it should be handled somehow.
  private readonly lock: AsyncLock = new AsyncLock();

  private readonly userPoolId: string;
  private readonly userPoolClientId: string;
  private readonly identityPoolId: string;
  private readonly allowGuestAccess: boolean | undefined;

  /**
   * Creates Amplify Auth client.
   */
  constructor(
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient,
    authConfig: NonNullable<ClientConfigVersionTemplateType<'1'>['auth']>
  ) {
    if (!authConfig.identity_pool_id) {
      throw new Error('Client config must have identity pool id.');
    }
    this.userPoolId = authConfig.user_pool_id;
    this.userPoolClientId = authConfig.user_pool_client_id;
    this.identityPoolId = authConfig.identity_pool_id;
    this.allowGuestAccess = authConfig.unauthenticated_identities_enabled;
  }

  // https://docs.amplify.aws/react/build-a-backend/auth/connect-your-frontend/sign-in/#sign-in-with-passwordless-methods
  createUser = async (
    username: string,
    password: string,
    preferredChal: string
  ): Promise<AuthUser> => {
    await this.lock.acquire();
    try {
      console.log(`creating ${username}`);
      //this may need to change
      const temporaryPassword = `Test1@Temp${randomUUID().toString()}`;
      if (preferredChal === 'Passkey') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (global as any).window = {};
      }
      await this.cognitoIdentityProviderClient.send(
        new AdminCreateUserCommand({
          Username: username,
          TemporaryPassword: temporaryPassword,
          UserPoolId: this.userPoolId,
          MessageAction: 'SUPPRESS',
        })
      );

      // in case there's already signed user in the session.
      await auth.signOut();
      /*
      switch(preferredChal) {
        case 'Passkey':
          console.log('Passkey was selected');
          const signInResult = await auth.signIn({
            username: username,
            options: {
              authFlowType: 'USER_AUTH',
              preferredChallenge: 'WEB_AUTHN',
            },
          });
          console.log(signInResult.nextStep.signInStep);

          if(signInResult.nextStep.signInStep === 'CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION') {
            const confirmSignIn = await auth.confirmSignIn({
              challengeResponse: 'PASSWORD',
            });

            console.log(confirmSignIn.nextStep.signInStep);
            
            const pwSignIn = await auth.signIn({
              username,
              password: temporaryPassword
            });

            console.log(pwSignIn.nextStep.signInStep);
            if(pwSignIn.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
              const confirmPW = await auth.confirmSignIn({
                challengeResponse: password
              });
              console.log(confirmPW.nextStep.signInStep);
              console.log('associating web auth credential...');
              await auth.associateWebAuthnCredential();
              
              const confirmSignIn = await auth.confirmSignIn({
                challengeResponse: 'WEB_AUTHN',
              });
              console.log(confirmSignIn.nextStep.signInStep);
            }
          }
          break;
        case 'Email':
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
            console.log('Attempting to confirm email');
            const challengeResponse = await AmplifyPrompter.input({
              message: `Input a challenge response for ${username}: `,
            });
    
            const confirmSignIn = await auth.confirmSignIn({
              challengeResponse: challengeResponse,
            });
    
            if (confirmSignIn.nextStep.signInStep === 'DONE') {
              console.log('Sign in successful');
            }
          }
          break;
      }*/
      //MFA TOTP works, sms and email have simpler flows
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
        console.log(result.nextStep.signInStep);

        if (result.nextStep.signInStep === 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP') {
          //TO DO: give the option to pass in app name so people can scan QR code instead of inputting secret
          const secretCode = result.nextStep.totpSetupDetails.sharedSecret;
          console.log(
            `Connect your preferred Authenticator App: ${secretCode}`
          );
          const challengeResponse = await AmplifyPrompter.input({
            message: `Input a challenge response for ${username}: `,
          });
          const totp = await auth.confirmSignIn({
            challengeResponse: challengeResponse,
          });
          console.log(totp.nextStep.signInStep);
        }
      }

      console.log('Sign in successful');
      return { username, preferredChal };
    } finally {
      try {
        // sign out to leave ok state;
        await auth.signOut();
      } catch (e) {
        // eat it
      }
      if (preferredChal === 'Passkey') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (global as any).window;
      }
      console.log(`user ${username} created`);
      this.lock.release();
    }
  };
}
