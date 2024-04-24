import { ClientConfigVersionTemplateType } from '@aws-amplify/client-config';
import { Amplify } from 'aws-amplify';
import * as auth from 'aws-amplify/auth';
import { IamCredentials } from './types.js';
import { shortUuid } from './short_uuid.js';
import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import assert from 'assert';

/**
 * This class creates credentials for entities managed by Amplify Auth.
 */
export class AmplifyAuthCredentialsFactory {
  private readonly userPoolId: string;
  private readonly userPoolClientId: string;
  private readonly identityPoolId: string;
  private readonly allowGuestAccess: boolean | undefined;

  /**
   * Creates Amplify Auth credentials factory.
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

  getNewAuthenticatedUserCredentials = async (): Promise<IamCredentials> => {
    const username = `amplify-backend-${shortUuid()}@amazon.com`;
    const temporaryPassword = `Test1@Temp${shortUuid()}`;
    const password = `Test1@${shortUuid()}`;
    await this.cognitoIdentityProviderClient.send(
      new AdminCreateUserCommand({
        Username: username,
        TemporaryPassword: temporaryPassword,
        UserPoolId: this.userPoolId,
        MessageAction: 'SUPPRESS',
      })
    );

    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: this.userPoolId,
          userPoolClientId: this.userPoolClientId,
          identityPoolId: this.identityPoolId,
          allowGuestAccess: this.allowGuestAccess,
        },
      },
    });

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

    const authSession = await auth.fetchAuthSession();

    if (!authSession.credentials) {
      throw new Error('No credentials in auth session');
    }

    return authSession.credentials;
  };

  getGuestAccessCredentials = async (): Promise<IamCredentials> => {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: this.userPoolId,
          userPoolClientId: this.userPoolClientId,
          identityPoolId: this.identityPoolId,
          allowGuestAccess: this.allowGuestAccess,
        },
      },
    });

    await auth.signOut();

    const authSession = await auth.fetchAuthSession();

    if (!authSession.credentials) {
      throw new Error('No credentials in auth session');
    }

    return authSession.credentials;
  };
}
