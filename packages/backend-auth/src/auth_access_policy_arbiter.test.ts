import { beforeEach, describe, it, mock } from 'node:test';
import { App, Stack } from 'aws-cdk-lib';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ConstructFactoryGetInstanceProps,
  ImportPathVerifier,
} from '@aws-amplify/plugin-types';
import {
  ConstructContainerStub,
  ImportPathVerifierStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { AuthAccessPolicyArbiter } from './auth_access_policy_arbiter.js';
import assert from 'node:assert';
import { UserPoolAccessPolicyFactory } from './userpool_access_policy_factory.js';

void describe('AuthAccessPolicyArbiter', () => {
  void describe('arbitratePolicies', () => {
    let stack: Stack;
    let constructContainer: ConstructContainer;
    let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
    let importPathVerifier: ImportPathVerifier;
    let getInstanceProps: ConstructFactoryGetInstanceProps;

    beforeEach(() => {
      stack = createStackAndSetContext();

      constructContainer = new ConstructContainerStub(
        new StackResolverStub(stack)
      );

      outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
        stack
      );

      importPathVerifier = new ImportPathVerifierStub();

      getInstanceProps = {
        constructContainer,
        outputStorageStrategy,
        importPathVerifier,
      };
    });

    void it('passes expected policy and ssm context to resource access acceptor', () => {
      const userpool = new UserPool(stack, 'testUserPool');
      const acceptResourceAccessMock = mock.fn();
      const authAccessPolicyArbiter = new AuthAccessPolicyArbiter(
        [
          {
            actions: ['manageUsers'],
            getResourceAccessAcceptor: () => ({
              identifier: 'testResourceAccessAcceptor',
              acceptResourceAccess: acceptResourceAccessMock,
            }),
          },
          {
            actions: ['deleteUser', 'disableUser', 'deleteUserAttributes'],
            getResourceAccessAcceptor: () => ({
              identifier: 'testResourceAccessAcceptor',
              acceptResourceAccess: acceptResourceAccessMock,
            }),
          },
        ],
        getInstanceProps,
        [{ name: 'TEST_USERPOOL_ID', path: 'test/ssm/path/to/userpool/id' }],
        new UserPoolAccessPolicyFactory(userpool)
      );

      authAccessPolicyArbiter.arbitratePolicies();
      assert.equal(acceptResourceAccessMock.mock.callCount(), 2);
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: [
                'cognito-idp:AdminConfirmSignUp',
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminDeleteUser',
                'cognito-idp:AdminDeleteUserAttributes',
                'cognito-idp:AdminDisableUser',
                'cognito-idp:AdminEnableUser',
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminListGroupsForUser',
                'cognito-idp:AdminRespondToAuthChallenge',
                'cognito-idp:AdminSetUserMFAPreference',
                'cognito-idp:AdminSetUserSettings',
                'cognito-idp:AdminUpdateUserAttributes',
                'cognito-idp:AdminUserGlobalSignOut',
              ],
              Effect: 'Allow',
              Resource: `${userpool.userPoolArn}`,
            },
          ],
          Version: '2012-10-17',
        }
      );
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[1].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: [
                'cognito-idp:AdminDeleteUser',
                'cognito-idp:AdminDisableUser',
                'cognito-idp:AdminDeleteUserAttributes',
              ],
              Effect: 'Allow',
              Resource: `${userpool.userPoolArn}`,
            },
          ],
          Version: '2012-10-17',
        }
      );
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[1],
        [{ name: 'TEST_USERPOOL_ID', path: 'test/ssm/path/to/userpool/id' }]
      );
    });
  });
});

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};
