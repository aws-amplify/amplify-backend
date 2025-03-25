import {
  AuthOutputs,
  AuthSignUp,
  AuthUser,
  AuthUserGroupInput,
} from '../types.js';
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import * as auth from 'aws-amplify/auth';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { PersistentPasswordFlow } from './persistent_password_flow.js';
import { MfaFlow } from './mfa_flow.js';
import { randomUUID } from 'node:crypto';
import { ConfigReader } from './config_reader.js';

/**
 *
 */
export class AuthClient {
  private readonly authOutputs;

  /**
   * Set up for auth APIs
   */
  constructor(
    configOutputs: ConfigReader,
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient = new CognitoIdentityProviderClient(),
    private readonly authApi = auth,
    private readonly persistentPasswordFlow = new PersistentPasswordFlow(),
    private readonly mfaFlow = new MfaFlow(),
  ) {
    this.authOutputs = configOutputs.getAuthConfig();
  }

  createAndSignUpUser = async (newUser: AuthSignUp): Promise<AuthOutputs> => {
    try {
      const authConfig = await this.authOutputs;
      await this.authApi.signOut();

      const tempPassword = `Test1@Temp${randomUUID().toString()}`;
      // in the future will need to check that the preferredSignInFlow is not passwordless
      try {
        await this.cognitoIdentityProviderClient.send(
          new AdminCreateUserCommand({
            Username: newUser.username,
            TemporaryPassword: tempPassword,
            UserPoolId: authConfig.userPoolId,
            MessageAction: 'SUPPRESS',
          }),
        );
      } catch (err) {
        const error = err as Error;
        if (error.name === 'UsernameExistsException') {
          throw new AmplifyUserError(
            'UsernameExistsError',
            {
              message: `A user called ${newUser.username} already exists.`,
              resolution: 'Give this user a different name',
            },
            error,
          );
        } else if (error.name === 'NotAuthorizedException') {
          throw new AmplifyUserError(
            'NotAuthorizedError',
            {
              message: 'You are not authorized to create a user',
              resolution:
                'Run npx ampx sandbox seed generate-policy, attach the outputted policy template to a role with AmplifyBackendDeployFullAccess, assume that role to run seed',
            },
            error,
          );
        } else {
          throw err;
        }
      }

      switch (newUser.signInFlow) {
        case 'Password': {
          await this.persistentPasswordFlow.persistentPasswordSignUp(
            newUser,
            tempPassword,
          );
          break;
        }
        case 'MFA': {
          if (
            !authConfig.mfaConfig ||
            (authConfig.mfaConfig && authConfig.mfaConfig === 'NONE')
          ) {
            throw new AmplifyUserError('MFANotConfiguredError', {
              message: `MFA is not configured for this userpool, you cannot create ${newUser.username} with MFA.`,
              resolution: `Enable MFA for this userpool or create ${newUser.username} with a different sign up flow.`,
            });
          }

          await this.mfaFlow.mfaSignUp(newUser, tempPassword);
          break;
        }
      }

      return {
        signInFlow: newUser.signInFlow,
        username: newUser.username,
      };
    } finally {
      if (!newUser.signInAfterCreation) {
        await this.authApi.signOut();
      }
    }
  };

  addToUserGroup = async (
    user: AuthUserGroupInput,
    group: string,
  ): Promise<void> => {
    const authConfig = await this.authOutputs;
    if (!authConfig.groups) {
      throw new AmplifyUserError('NoGroupsError', {
        message: `There are no groups in this userpool.`,
        resolution: `Create a group called ${group}.`,
      });
    } else {
      if (authConfig.groups?.includes(group)) {
        try {
          await this.cognitoIdentityProviderClient.send(
            new AdminAddUserToGroupCommand({
              UserPoolId: authConfig.userPoolId,
              Username: user.username,
              GroupName: group,
            }),
          );
        } catch (err) {
          const error = err as Error;
          if (error.name === 'UserNotFoundException') {
            throw new AmplifyUserError(
              'UserNotFoundError',
              {
                message: `The user, ${user.username}, does not exist`,
                resolution: `Create a user called ${user.username} or try again with a different user`,
              },
              error,
            );
          } else {
            throw error;
          }
        }
      } else {
        throw new AmplifyUserError('NoGroupError', {
          message: `There is no group called ${group} in this userpool.`,
          resolution: `Either create a group called ${group} or assign this user to a group that exists on this userpool.`,
        });
      }
    }
  };

  signInUser = async (user: AuthUser): Promise<boolean> => {
    await this.authApi.signOut();
    switch (user.signInFlow) {
      case 'Password': {
        const result =
          this.persistentPasswordFlow.persistentPasswordSignIn(user);
        return result;
      }
      case 'MFA': {
        const result = await this.mfaFlow.mfaSignIn(user);
        return result;
      }
    }
  };
}
