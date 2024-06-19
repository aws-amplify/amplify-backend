import { AsyncLock } from './async_lock.js';
import { AuthClient, AuthUser } from './types.js';
import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { randomUUID } from 'node:crypto';
import { ClientConfigVersionTemplateType } from '@aws-amplify/client-config';
import * as auth from 'aws-amplify/auth';
import assert from 'assert';
import { SemVer } from 'semver';
import crypto from 'node:crypto';

// TODO: this is a work around
// it seems like as of amplify v6 , some of the code only runs in the browser ...
// see https://github.com/aws-amplify/amplify-js/issues/12751
if (process.versions.node) {
  // node >= 20 now exposes crypto by default. This workaround is not needed: https://github.com/nodejs/node/pull/42083
  if (new SemVer(process.versions.node).major < 20) {
    // @ts-expect-error altering typing for global to make compiler happy is not worth the effort assuming this is temporary workaround
    globalThis.crypto = crypto;
  }
}

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

  createUser = async (
    username: string,
    password: string
  ): Promise<AuthUser> => {
    await this.lock.acquire();
    try {
      console.log(`creating ${username}, ${password}`);
      const temporaryPassword = `Test1@Temp${randomUUID().toString()}`;
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

      const signInResult = await auth.signIn({
        username,
        password: temporaryPassword,
      });

      assert.strictEqual(
        signInResult.nextStep.signInStep,
        'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
      );

      await auth.confirmSignIn({
        challengeResponse: password,
      });

      return {
        username,
        password,
      };
    } finally {
      console.log(`user ${username} created`);
      this.lock.release();
    }
  };

  executeAsUser = async (authUser: AuthUser, callback: () => Promise<void>) => {
    await this.lock.acquire();
    try {
      // in case there's already signed user in the session.
      await auth.signOut();
      await auth.signIn({
        username: authUser.username,
        password: authUser.password,
      });

      try {
        await callback();
      } finally {
        await auth.signOut();
      }
    } finally {
      this.lock.release();
    }
  };
}
