import { AuthOutputs, AuthSignUp, AuthUser } from './types.js';
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import * as auth from 'aws-amplify/auth';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { generateClientConfig } from '@aws-amplify/client-config';
import { randomUUID } from 'node:crypto'; // TO DO: figure out an alternative to using crypto
import { persistentPasswordSignUp } from './persistent_password_flow.js';
import { mfaSignIn, mfaSignUp } from './mfa_flow.js';

/**
 *
 */
export class AuthClient {
  private userPoolId: string;
  private mfaMethods?: ('SMS' | 'TOTP')[];
  private mfaConfig?: 'NONE' | 'REQUIRED' | 'OPTIONAL';
  private userGroups?: string[];

  /**
   * Set up for auth APIs
   * @param cognitoIdentityProviderClient - Cognito Client used for creating users and adding users to groups
   */
  constructor(
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient
  ) {}

  getAuthOutputs = async (): Promise<void> => {
    if (!process.env.AMPLIFY_SANDBOX_IDENTIFIER) {
      throw new AmplifyUserError('SandboxIdentifierNotFoundError', {
        message: 'Sandbox Identifier is undefined',
        resolution:
          'Run npx ampx sandbox before re-running npx ampx sandbox seed',
      });
    }

    const backendId: BackendIdentifier = JSON.parse(
      process.env.AMPLIFY_SANDBOX_IDENTIFIER
    );

    const authConfig = (await generateClientConfig(backendId, '1.3')).auth;
    if (!authConfig) {
      throw new AmplifyUserError('MissingAuthError', {
        message:
          'Outputs for Auth are missing, you may be missing an Auth resource',
        resolution:
          'Create an Auth resource for your Amplify App or run ampx sandbox if you have generated your sandbox',
      });
    }

    this.userPoolId = authConfig.user_pool_id;
    this.mfaMethods = authConfig.mfa_methods;
    this.mfaConfig = authConfig.mfa_configuration;
    for (const group in authConfig.groups) {
      this.userGroups?.push(group);
    }
  };

  createAndSignUpUser = async (newUser: AuthSignUp): Promise<AuthOutputs> => {
    try {
      await this.getAuthOutputs();
      await auth.signOut();

      const tempPassword = `Test_Temp+${randomUUID.toString()}`;
      // in the future will need to check that the preferredSignInFlow is not passwordless
      await this.cognitoIdentityProviderClient.send(
        new AdminCreateUserCommand({
          Username: newUser.username,
          TemporaryPassword: tempPassword,
          UserPoolId: this.userPoolId,
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
            !this.mfaConfig ||
            (this.mfaConfig && this.mfaConfig === 'NONE')
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
            if (this.mfaMethods && this.mfaMethods.length === 1) {
              newUser.mfaPreference = this.mfaMethods[0];
            } else if (this.mfaMethods && this.mfaMethods.length > 1) {
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
    await this.getAuthOutputs();
    if (this.userGroups?.includes) {
      await this.cognitoIdentityProviderClient.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: this.userPoolId,
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
    await this.getAuthOutputs();
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

/**
 * Creates and signs up a new user
 * @param newUser - contains properties required to create new user
 * @returns - Username and Sign up flow used by the new user
 */
export const createAndSignUpUser = async (
  newUser: AuthSignUp
): Promise<AuthOutputs> => {
  return await new AuthClient(
    new CognitoIdentityProviderClient()
  ).createAndSignUpUser(newUser);
};

/**
 * Adds a user to a group
 * @param user - user to add to a group
 * @param group - group to add the user to
 * @returns - Username and Sign up flow used by this user
 */
export const addToUserGroup = async (
  user: AuthUser,
  group: string
): Promise<AuthOutputs> => {
  return await new AuthClient(
    new CognitoIdentityProviderClient()
  ).addToUserGroup(user, group);
};

/**
 * Signs in a user
 * @param user - user to sign in
 * @returns - true if user was successfully signed in, false otherwise
 */
export const signInUser = async (user: AuthUser): Promise<boolean> => {
  return await new AuthClient(new CognitoIdentityProviderClient()).signInUser(
    user
  );
};

/*
export const getAuthOutputs = async () => {
    if (!process.env.AMPLIFY_SANDBOX_IDENTIFIER) {
        throw new AmplifyUserError('SandboxIdentifierNotFoundError', {
          message: 'Sandbox Identifier is undefined',
          resolution:
            'Run npx ampx sandbox before re-running npx ampx sandbox seed',
        });
      }
  
      const backendId: BackendIdentifier = JSON.parse(
        process.env.AMPLIFY_SANDBOX_IDENTIFIER
      );
  
      const authConfig = (await generateClientConfig(backendId, '1.3')).auth;
      if (!authConfig) {
        throw Error('Missing auth configuration');
      }
      if (!authConfig.identity_pool_id) {
        throw Error('Must have identity pool');
      }
  
      this.userPoolId = authConfig.user_pool_id;
      this.userPoolClientId = authConfig.user_pool_client_id;
      this.identityPoolId = authConfig.identity_pool_id;
      this.mfaMethods = authConfig.mfa_methods;
      this.mfaConfig = authConfig.mfa_configuration;
}*/
