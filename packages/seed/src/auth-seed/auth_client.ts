import { AuthOutputs, AuthSignUp, AuthUser } from '../types.js';
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import * as auth from 'aws-amplify/auth';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { persistentPasswordSignUp } from './persistent_password_flow.js';
import { mfaSignIn, mfaSignUp } from './mfa_flow.js';
import { randomUUID } from 'node:crypto';
import { ConfigReader } from './config_reader.js';

/**
 *
 */
export class AuthClient {
  private readonly authOutputs;
  private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient;

  /**
   * Set up for auth APIs
   */
  constructor(configOutputs: ConfigReader) {
    this.cognitoIdentityProviderClient = new CognitoIdentityProviderClient();

    this.authOutputs = configOutputs.getAuthConfig();
  }

  createAndSignUpUser = async (newUser: AuthSignUp): Promise<AuthOutputs> => {
    try {
      const authConfig = await this.authOutputs;
      await auth.signOut();

      const tempPassword = `Test1@Temp${randomUUID().toString()}`;
      // in the future will need to check that the preferredSignInFlow is not passwordless
      await this.cognitoIdentityProviderClient.send(
        new AdminCreateUserCommand({
          Username: newUser.username,
          TemporaryPassword: tempPassword,
          UserPoolId: authConfig.userPoolId,
          MessageAction: 'SUPPRESS',
        })
      );

      switch (newUser.signInFlow) {
        case 'Password': {
          await persistentPasswordSignUp(newUser, tempPassword);
          break;
        }
        case 'MFA': {
          if (
            !authConfig.mfaConfig ||
            (authConfig.mfaConfig && authConfig.mfaConfig === 'NONE') ||
            !authConfig.mfaConfig
          ) {
            throw new AmplifyUserError('MFANotConfiguredError', {
              message: `MFA is not configured for this userpool, you cannot create ${newUser.username} with MFA.`,
              resolution: `Enable MFA for this userpool or create ${newUser.username} with a different sign up flow.`,
            });
          }

          if (!newUser.mfaPreference) {
            if (authConfig.mfaMethods && authConfig.mfaMethods.length === 1) {
              newUser.mfaPreference = authConfig.mfaMethods[0];
            } else if (
              authConfig.mfaMethods &&
              authConfig.mfaMethods.length > 1
            ) {
              throw new AmplifyUserError('NoMFAPreferenceSpecifiedError', {
                message: `If multiple forms of MFA are enabled for a userpool, you must specify which form you intend to use for ${newUser.username}`,
                resolution: `Specify a form of MFA for the user, ${newUser.username}, to use with the mfaPreference property`,
              });
            }
          }

          await mfaSignUp(newUser, tempPassword);
          break;
        }
      }

      return {
        signInFlow: newUser.signInFlow,
        username: newUser.username,
      };
    } finally {
      if (!newUser.signInAfterCreation) {
        await auth.signOut();
      }
    }
  };

  addToUserGroup = async (
    user: AuthUser,
    group: string
  ): Promise<AuthOutputs> => {
    const authConfig = await this.authOutputs;
    if (authConfig.groups?.includes) {
      await this.cognitoIdentityProviderClient.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: authConfig.userPoolId,
          Username: user.username,
          GroupName: group,
        })
      );
    } else {
      throw new AmplifyUserError('NoGroupError', {
        message: `There is no group called ${group} in this userpool.`,
        resolution: `Either create a group called ${group} or assign this user to a group that exists on this userpool.`,
      });
    }
    return { signInFlow: user.signInFlow, username: user.username };
  };

  signInUser = async (user: AuthUser): Promise<boolean> => {
    await auth.signOut();
    switch (user.signInFlow) {
      case 'Password': {
        const signInResult = await auth.signIn({
          username: user.username,
          password: user.password,
        });

        return signInResult.nextStep.signInStep === 'DONE';
      }
      case 'MFA': {
        const result = await mfaSignIn(user);
        return result;
      }
    }
  };
}
