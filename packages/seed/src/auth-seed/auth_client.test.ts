import { beforeEach, describe, it, mock } from 'node:test';
import { AuthClient } from './auth_client.js';
import { AuthConfiguration, ConfigReader } from './config_reader.js';
import assert from 'assert';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminCreateUserResponse,
  CognitoIdentityProviderClient,
  NotAuthorizedException,
  UserNotFoundException,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import * as auth from 'aws-amplify/auth';
import { AuthSignUp, AuthUser } from '../types.js';
import { MfaFlow } from './mfa_flow.js';

const testUsername = 'testUser1@test.com';
const testPassword = 'T3st_Password*';
const testGroup0 = 'TESTGROUP';
const testGroup1 = 'OTHERGROUP';

const testUserpoolId = 'us-east-1_userpoolTest';

void describe('seeding auth APIs', () => {
  void describe('adding to user group', () => {
    void describe('no groups exist on userpool', () => {
      const mockConfigReader = {
        getAuthConfig: mock.fn<() => Promise<AuthConfiguration>>(async () =>
          Promise.resolve({
            userPoolId: testUserpoolId,
          })
        ),
      };

      const authClient = new AuthClient(
        mockConfigReader as unknown as ConfigReader
      );

      void it('throws error if no groups exist', async () => {
        const expectedErr = new AmplifyUserError('NoGroupsError', {
          message: `There are no groups in this userpool.`,
          resolution: `Create a group called ${testGroup0}.`,
        });

        await assert.rejects(
          async () =>
            await authClient.addToUserGroup(
              { username: testUsername },
              testGroup0
            ),
          expectedErr
        );
      });
    });

    void describe('userpool has groups defined', () => {
      const mockConfigReader = {
        getAuthConfig: mock.fn<() => Promise<AuthConfiguration>>(async () =>
          Promise.resolve({
            userPoolId: testUserpoolId,
            groups: [testGroup0],
          })
        ),
      };

      const mockCognitoIdProviderClient = {
        send: mock.fn<(input: AdminAddUserToGroupCommand) => Promise<void>>(
          async () => Promise.resolve()
        ),
      };

      const authClient = new AuthClient(
        mockConfigReader as unknown as ConfigReader,
        mockCognitoIdProviderClient as unknown as CognitoIdentityProviderClient
      );

      beforeEach(() => {
        mockCognitoIdProviderClient.send.mock.resetCalls();
        mockConfigReader.getAuthConfig.mock.resetCalls();
      });

      void it('adds user to an existing user group', async () => {
        await authClient.addToUserGroup({ username: testUsername }, testGroup0);

        assert.strictEqual(
          mockCognitoIdProviderClient.send.mock.callCount(),
          1
        );
        assert.strictEqual(
          mockCognitoIdProviderClient.send.mock.calls[0].error,
          undefined
        );
      });

      void it('throws error if user does not exist', async () => {
        const expectedErr = new AmplifyUserError('UserNotFoundError', {
          message: `The user, ${testUsername}, does not exist`,
          resolution: `Create a user called ${testUsername} or try again with a different user`,
        });

        mockCognitoIdProviderClient.send.mock.mockImplementationOnce(() =>
          Promise.reject(
            new UserNotFoundException({
              $metadata: {},
              message: 'could not find user',
            })
          )
        );

        await assert.rejects(
          async () =>
            await authClient.addToUserGroup(
              { username: testUsername },
              testGroup0
            ),
          (error: AmplifyUserError) => {
            assert.strictEqual(error.name, expectedErr.name);
            assert.strictEqual(error.message, expectedErr.message);
            assert.strictEqual(error.resolution, expectedErr.resolution);
            return true;
          }
        );
      });

      void it('throws error if group does not exist on userpool', async () => {
        const expectedErr = new AmplifyUserError('NoGroupError', {
          message: `There is no group called ${testGroup1} in this userpool.`,
          resolution: `Either create a group called ${testGroup1} or assign this user to a group that exists on this userpool.`,
        });

        await assert.rejects(
          async () =>
            await authClient.addToUserGroup(
              { username: testUsername },
              testGroup1
            ),
          expectedErr
        );
      });
    });
  });

  // this is also where the tests that apply to all createAndSignUp user flows go
  void describe('userpool configured without MFA', () => {
    const mockConfigReader = {
      getAuthConfig: mock.fn<() => Promise<AuthConfiguration>>(async () =>
        Promise.resolve({
          userPoolId: testUserpoolId,
        })
      ),
    };

    const mockCognitoIdProviderClient = {
      send: mock.fn<
        (input: AdminCreateUserCommand) => Promise<AdminCreateUserResponse>
      >(async () =>
        Promise.resolve({
          User: {
            Username: testUsername,
          },
        })
      ),
    };

    const mockAuthAPIs = {
      signOut: mock.fn<() => Promise<void>>(async () => Promise.resolve()),
      signIn: mock.fn<(input: auth.SignInInput) => Promise<auth.SignInOutput>>(
        async () =>
          Promise.resolve({
            isSignedIn: true,
            nextStep: { signInStep: 'DONE' },
          } as auth.SignInOutput)
      ),
      confirmSignIn: mock.fn<
        (input: auth.ConfirmSignInInput) => Promise<auth.ConfirmSignInOutput>
      >(async () =>
        Promise.resolve({
          isSignedIn: true,
          nextStep: { signInStep: 'DONE' },
        } as auth.SignInOutput)
      ),
    };

    const authClient = new AuthClient(
      mockConfigReader as unknown as ConfigReader,
      mockCognitoIdProviderClient as unknown as CognitoIdentityProviderClient,
      mockAuthAPIs as unknown as typeof auth
    );

    beforeEach(() => {
      mockCognitoIdProviderClient.send.mock.resetCalls();
      mockConfigReader.getAuthConfig.mock.resetCalls();
      mockAuthAPIs.signIn.mock.resetCalls();
      mockAuthAPIs.signOut.mock.resetCalls();
      mockAuthAPIs.confirmSignIn.mock.resetCalls();
    });

    void it('creates and signs up user', async () => {
      mockAuthAPIs.signIn.mock.mockImplementationOnce(async () =>
        Promise.resolve({
          isSignedIn: true,
          nextStep: {
            signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
          },
        } as auth.SignInOutput)
      );

      await authClient.createAndSignUpUser({
        username: testUsername,
        password: testPassword,
        signInAfterCreation: true,
        signInFlow: 'Password',
      });

      assert.strictEqual(mockCognitoIdProviderClient.send.mock.callCount(), 1);
      assert.strictEqual(mockAuthAPIs.signIn.mock.callCount(), 1);
      assert.strictEqual(mockAuthAPIs.confirmSignIn.mock.callCount(), 1);
    });

    void it('throws error if attempting to create user that already exists', async () => {
      const expectedErr = new AmplifyUserError('UsernameExistsError', {
        message: `A user called ${testUsername} already exists.`,
        resolution: 'Give this user a different name',
      });

      mockCognitoIdProviderClient.send.mock.mockImplementationOnce(() => {
        throw new UsernameExistsException({
          $metadata: {},
          message: 'Username already exists',
        });
      });

      await assert.rejects(
        async () =>
          authClient.createAndSignUpUser({
            username: testUsername,
            password: testPassword,
            signInAfterCreation: true,
            signInFlow: 'Password',
          }),
        (err: AmplifyUserError) => {
          assert.strictEqual(err.name, expectedErr.name);
          assert.strictEqual(err.message, expectedErr.message);
          assert.strictEqual(err.resolution, expectedErr.resolution);
          return true;
        }
      );
    });

    void it('throws error if attempting to create user without proper permissions', async () => {
      const expectedErr = new AmplifyUserError('NotAuthorizedError', {
        message: 'You are not authorized to create a user',
        resolution:
          'Run npx ampx sandbox seed generate-policy and attach the outputted policy to yourself',
      });

      mockCognitoIdProviderClient.send.mock.mockImplementationOnce(() => {
        throw new NotAuthorizedException({
          $metadata: {},
          message: 'Not authorized to create users',
        });
      });

      await assert.rejects(
        async () =>
          authClient.createAndSignUpUser({
            username: testUsername,
            password: testPassword,
            signInAfterCreation: true,
            signInFlow: 'Password',
          }),
        (err: AmplifyUserError) => {
          assert.strictEqual(err.name, expectedErr.name);
          assert.strictEqual(err.message, expectedErr.message);
          assert.strictEqual(err.resolution, expectedErr.resolution);
          return true;
        }
      );
    });

    void it('throws error if attempting to create user with MFA when MFA is not configured', async () => {
      const expectedErr = new AmplifyUserError('MFANotConfiguredError', {
        message: `MFA is not configured for this userpool, you cannot create ${testUsername} with MFA.`,
        resolution: `Enable MFA for this userpool or create ${testUsername} with a different sign up flow.`,
      });

      await assert.rejects(
        async () =>
          authClient.createAndSignUpUser({
            username: testUsername,
            password: testPassword,
            signInAfterCreation: true,
            signInFlow: 'MFA',
          }),
        (err: AmplifyUserError) => {
          assert.strictEqual(err.name, expectedErr.name);
          assert.strictEqual(err.message, expectedErr.message);
          assert.strictEqual(err.resolution, expectedErr.resolution);
          return true;
        }
      );
    });

    void it('signs in user with persistent password', async () => {
      const output = await authClient.signInUser({
        username: testUsername,
        password: testPassword,
        signInFlow: 'Password',
      });

      assert.strictEqual(mockAuthAPIs.signIn.mock.callCount(), 1);
      assert.strictEqual(output, true);
    });

    void it('throws error if attempting to sign in user that does not exist', async () => {
      const expectedErr = new AmplifyUserError('UserExistsError', {
        message: `${testUsername} does not exist`,
        resolution: `Create a user called ${testUsername}`,
      });

      mockAuthAPIs.signIn.mock.mockImplementationOnce(() =>
        Promise.reject(
          new UserNotFoundException({
            $metadata: {},
            message: `${testUsername} does not exist`,
          })
        )
      );

      await assert.rejects(
        async () =>
          authClient.signInUser({
            username: testUsername,
            password: testPassword,
            signInFlow: 'Password',
          }),
        (err: AmplifyUserError) => {
          assert.strictEqual(err.name, expectedErr.name);
          assert.strictEqual(err.message, expectedErr.message);
          assert.strictEqual(err.resolution, expectedErr.resolution);
          return true;
        }
      );
    });
  });

  void describe('userpool configured with MFA', () => {
    const testNumber = '+11234567890';

    const mockConfigReader = {
      getAuthConfig: mock.fn<() => Promise<AuthConfiguration>>(async () =>
        Promise.resolve({
          userPoolId: testUserpoolId,
          mfaMethods: ['SMS', 'TOTP'],
          mfaConfig: 'REQUIRED',
        })
      ),
    };

    const mockCognitoIdProviderClient = {
      send: mock.fn<
        (input: AdminCreateUserCommand) => Promise<AdminCreateUserResponse>
      >(async () =>
        Promise.resolve({
          User: {
            Username: testUsername,
          },
        })
      ),
    };

    const mockAuthAPIs = {
      signOut: mock.fn<() => Promise<void>>(async () => Promise.resolve()),
    };

    const mockMfaFlow = {
      mfaSignUp: mock.fn<
        (user: AuthSignUp, tempPassword: string) => Promise<boolean>
      >(async () => Promise.resolve(true)),
      mfaSignIn: mock.fn<(user: AuthUser) => Promise<boolean>>(async () =>
        Promise.resolve(true)
      ),
    };

    const authClient = new AuthClient(
      mockConfigReader as unknown as ConfigReader,
      mockCognitoIdProviderClient as unknown as CognitoIdentityProviderClient,
      mockAuthAPIs as unknown as typeof auth,
      mockMfaFlow as unknown as MfaFlow
    );

    beforeEach(() => {
      mockCognitoIdProviderClient.send.mock.resetCalls();
      mockConfigReader.getAuthConfig.mock.resetCalls();
      mockAuthAPIs.signOut.mock.resetCalls();
      mockMfaFlow.mfaSignIn.mock.resetCalls();
      mockMfaFlow.mfaSignUp.mock.resetCalls();
    });

    void it('creates a user with MFA', async () => {
      await authClient.createAndSignUpUser({
        username: testUsername,
        password: testPassword,
        signInAfterCreation: true,
        signInFlow: 'MFA',
        userAttributes: {
          phoneNumber: testNumber,
        },
      });

      assert.strictEqual(mockMfaFlow.mfaSignUp.mock.callCount(), 1);
      assert.strictEqual(mockCognitoIdProviderClient.send.mock.callCount(), 1);
    });

    void it('signs in a user with MFA', async () => {
      await authClient.signInUser({
        username: testUsername,
        password: testPassword,
        signInFlow: 'MFA',
      });

      assert.strictEqual(mockMfaFlow.mfaSignIn.mock.callCount(), 1);
    });
  });
});
