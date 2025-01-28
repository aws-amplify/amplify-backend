/* eslint-disable */
import { AsyncLock } from './async_lock.js';
import { AuthClient, AuthUser } from './types.js';
import {
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  CognitoIdentityProviderClient,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { randomUUID, sign } from 'node:crypto';
import { ClientConfigVersionTemplateType } from '@aws-amplify/client-config';
import * as auth from 'aws-amplify/auth';
//import assert from 'assert';
import { mfaSignUp } from './mfa_authentication.js';
import { passwordlessSignUp } from './passwordless_authentication.js';
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
  createUser = async (user: AuthUser): Promise<AuthUser> => {
    await this.lock.acquire();
    try {
      console.log(`creating ${user.username}`);

      // in case there's already signed user in the session.
      await auth.signOut();

      switch (user.signUpOption) {
        case 'Passwordless':
          await this.cognitoIdentityProviderClient.send(
            new AdminCreateUserCommand({
              Username: user.username,
              UserPoolId: this.userPoolId,
              MessageAction: 'SUPPRESS',
            })
          );

          await passwordlessSignUp(user.username);
          console.log('Sign in successful');
          break;
        case 'MFA':
          const temporaryPassword = `Test1@Temp${randomUUID().toString()}`;
          await this.cognitoIdentityProviderClient.send(
            new AdminCreateUserCommand({
              Username: user.username,
              TemporaryPassword: temporaryPassword,
              UserPoolId: this.userPoolId,
              MessageAction: 'SUPPRESS',
            })
          );

          await mfaSignUp(user.username, temporaryPassword, user.password!);
          console.log('Sign in successful');
          break;
      }
      return user;
    } finally {
      try {
        // sign out to leave ok state;
        await auth.signOut();
      } catch (e) {
        // eat it
      }
      console.log(`user ${user.username} created`);
      this.lock.release();
    }
  };

  //this works, but I would like for it to not require a challenge everytime someone wants to sign in with a user
  signInUser = async (user: AuthUser) => {
    switch (user.signUpOption) {
      case 'Passwordless':
        const signIn = await this.cognitoIdentityProviderClient.send(
          new AdminInitiateAuthCommand({
            AuthFlow: 'USER_AUTH',
            ClientId: this.userPoolClientId,
            UserPoolId: this.userPoolId,
            AuthParameters: {
              USERNAME: user.username,
            },
          })
        );

        const challengeResponse = await AmplifyPrompter.input({
          message: `Input a challenge response for ${user.username}: `,
        });
        const output = await this.cognitoIdentityProviderClient.send(
          new RespondToAuthChallengeCommand({
            ChallengeName: 'EMAIL_OTP',
            ChallengeResponses: {
              USERNAME: user.username,
              EMAIL_OTP_CODE: challengeResponse,
            },
            ClientId: this.userPoolClientId,
            Session: signIn.Session,
          })
        );
        console.log(output.AuthenticationResult);
        console.log('Signed in');
        break;
      case 'MFA':
        const signInResult = await auth.signIn({
          username: user.username,
          password: user.password,
        });
        console.log(signInResult.nextStep.signInStep);

        if (
          signInResult.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE'
        ) {
          const challengeResponse = await AmplifyPrompter.input({
            message: `Input a challenge response for ${user.username}: `,
          });
          const totp = await auth.confirmSignIn({
            challengeResponse: challengeResponse,
          });
          console.log(totp);
        }
        break;
    }
  };
}
