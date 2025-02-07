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
import { AuthOutputsReader } from './auth_outputs_reader.js';
import { randomUUID } from 'node:crypto';

/**
 *
 */
export class AuthClient {
  private readonly authOutputs;
  private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient;

  /**
   * Set up for auth APIs
   */
  constructor() {
    this.cognitoIdentityProviderClient = new CognitoIdentityProviderClient();

    this.authOutputs = AuthOutputsReader.getAuthConfig();
  }

  createAndSignUpUser = async (newUser: AuthSignUp): Promise<AuthOutputs> => {
    try {
      await auth.signOut();

      const tempPassword = `Test_Temp+${randomUUID.toString()}`;
      const authConfig = await this.authOutputs;
      // in the future will need to check that the preferredSignInFlow is not passwordless
      await this.cognitoIdentityProviderClient.send(
        new AdminCreateUserCommand({
          Username: newUser.username,
          TemporaryPassword: tempPassword,
          UserPoolId: authConfig.userPoolId,
          MessageAction: 'SUPPRESS',
        })
      );

      switch (newUser.preferredSignInFlow) {
        case 'Password': {
          if (!newUser.password) {
            throw new AmplifyUserError('MissingPasswordError', {
              message: `${newUser.username} is missing a password. Persistent password sign up flow requires a password`,
              resolution: `Ensure that ${newUser.username} has a password included in its properties`,
            });
          }
          await persistentPasswordSignUp({
            username: newUser.username,
            tempPassword: tempPassword,
            password: newUser.password,
          });
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

          if (!newUser.password) {
            throw new AmplifyUserError('MissingPasswordError', {
              message: `${newUser.username} is missing a password. MFA sign up flow requires a password`,
              resolution: `Ensure that ${newUser.username} has a password included in its properties`,
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
            } else {
              throw new AmplifyUserError('NoMFAMethodsError', {
                message: 'There are no forms of MFA enabled for this userpool.',
                resolution: `Either enable at least one from of MFA or create this user with a different sign up flow.`,
              });
            }
          }

          await mfaSignUp({
            username: newUser.username,
            tempPassword: tempPassword,
            password: newUser.password,
            mfaPreference: newUser.mfaPreference,
            signUpChallenge: newUser.signUpChallenge,
          });
          break;
        }
      }

      return {
        signInFlow: newUser.preferredSignInFlow,
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
        if (!user.password) {
          throw new AmplifyUserError('MissingPasswordError', {
            message: `${user.username} is missing a password. MFA sign in flow requires a password`,
            resolution: `Ensure that ${user.username} has a password included in its properties`,
          });
        }

        const result = await mfaSignIn({
          username: user.username,
          password: user.password,
          signInChallenge: user.signInChallenge,
        });
        return result;
      }
    }
  };
}
