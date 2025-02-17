import { beforeEach, describe, it, mock } from 'node:test';
import { App, Stack } from 'aws-cdk-lib';
import { AuthClient } from './auth_client.js';
import { AuthConfiguration, ConfigReader } from './config_reader.js';
import { AmplifyAuth } from '@aws-amplify/auth-construct';
import assert from 'assert';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import {
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';

const testUsername1 = 'testUser1@test.com';
const testGroup0 = 'TESTGROUP';
const testGroup1 = 'OTHERGROUP';

const testUserpoolId = 'us-east-1_userpoolTest';

void describe('seeding auth APIs', () => {
  void describe('adding to user group', () => {
    void describe('no groups exist on userpool', () => {
      const app = new App();
      const stack = new Stack(app);

      const authConstruct = new AmplifyAuth(stack, 'test3', {
        loginWith: { email: true },
      });
      const mockConfigReader = {
        getAuthConfig: mock.fn<() => Promise<AuthConfiguration>>(async () =>
          Promise.resolve({
            userPoolId: authConstruct.resources.userPool.userPoolId,
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
              { username: testUsername1, signInFlow: 'Password' },
              testGroup0
            ),
          expectedErr
        );
      });
    });

    void describe('userpool has groups defined', () => {
      const app = new App();
      const stack = new Stack(app);

      const authConstruct = new AmplifyAuth(stack, 'test3', {
        loginWith: { email: true },
        groups: [testGroup0],
      });
      const groups: string[] = [];

      for (const group in authConstruct.resources.groups) {
        groups.push(group);
      }

      const mockConfigReader = {
        getAuthConfig: mock.fn<() => Promise<AuthConfiguration>>(async () =>
          Promise.resolve({
            userPoolId: testUserpoolId,
            groups: groups,
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

      //TO DO: ask about if there is a better way to test this
      void it('adds user to an existing user group', async () => {
        await authClient.addToUserGroup(
          { username: testUsername1, signInFlow: 'Password' },
          testGroup0
        );

        assert.strictEqual(
          mockCognitoIdProviderClient.send.mock.callCount(),
          1
        );
      });

      void it('throws error if user does not exist', async () => {
        const expectedErr = new AmplifyUserError('UserNotFoundError', {
          message: `The user, ${testUsername1}, does not exist`,
          resolution: `Create a user called ${testUsername1} or try again with a different user`,
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
              { username: testUsername1, signInFlow: 'Password' },
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
              { username: testUsername1, signInFlow: 'MFA' },
              testGroup1
            ),
          expectedErr
        );
      });
    });
  });
  void describe('userpool configured with persistent password', () => {
    //const app = new App();
    //const stack = new Stack(app);
    //new AmplifyAuth(stack, 'test', {loginWith: { }});

    void it('creates and signs up user', async () => {});

    void it('throws error if attempting to create user that already exists', async () => {});

    void it('signs in user', async () => {});

    void it('throws error if attempting to sign in user that does not exist', async () => {});
  });
  void describe('userpool configured with MFA', () => {});
});
