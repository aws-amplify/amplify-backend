import { beforeEach, describe, it, mock } from 'node:test';
import { App, Stack } from 'aws-cdk-lib';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ConstructFactoryGetInstanceProps,
  ImportPathVerifier,
  SsmEnvironmentEntriesGenerator,
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

void describe('AuthAccessPolicyArbiter', () => {
  void describe('arbitratePolicies', () => {
    let stack: Stack;
    let constructContainer: ConstructContainer;
    let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
    let importPathVerifier: ImportPathVerifier;
    let getInstanceProps: ConstructFactoryGetInstanceProps;

    const ssmEnvironmentEntriesGeneratorStub: SsmEnvironmentEntriesGenerator = {
      generateSsmEnvironmentEntries: mock.fn(() => [
        { name: 'TEST_USERPOOL_ID', path: 'test/ssm/path/to/userpool/id' },
      ]),
    };

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
      const storageAccessPolicyArbiter = new AuthAccessPolicyArbiter(
        'testName',
        {
          users: {
            actions: ['read', 'update'],
            getResourceAccessAcceptor: () => ({
              identifier: 'testResourceAccessAcceptor',
              acceptResourceAccess: acceptResourceAccessMock,
            }),
          },
          groups: {
            actions: ['read', 'list'],
            getResourceAccessAcceptor: () => ({
              identifier: 'testResourceAccessAcceptor',
              acceptResourceAccess: acceptResourceAccessMock,
            }),
          },
        },
        ssmEnvironmentEntriesGeneratorStub,
        getInstanceProps,
        userpool
      );

      storageAccessPolicyArbiter.arbitratePolicies();
      assert.equal(acceptResourceAccessMock.mock.callCount(), 2);
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: [
                'cognito-identity:Describe*',
                'cognito-identity:Get*',
                'cognito-idp:Describe*',
                'cognito-idp:AdminGetDevice',
                'cognito-idp:AdminGetUser',
                'cognito-sync:Describe*',
                'cognito-sync:Get*',
              ],
              Effect: 'Allow',
              Resource: `${userpool.userPoolArn}`,
            },
            {
              Action: [
                'cognito-idp:ForgotPassword',
                'cognito-idp:UpdateAuthEventFeedback',
                'cognito-idp:UpdateResourceServer',
                'cognito-idp:UpdateUserPoolClient',
                'cognito-idp:AdminUpdateUserAttributes',
                'cognito-idp:UpdateUserAttributes',
                'cognito-idp:UpdateUserPoolDomain',
                'cognito-idp:UpdateIdentityProvider',
                'cognito-idp:UpdateGroup',
                'cognito-idp:AdminUpdateAuthEventFeedback',
                'cognito-idp:UpdateDeviceStatus',
                'cognito-idp:UpdateUserPool',
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
                'cognito-identity:Describe*',
                'cognito-identity:Get*',
                'cognito-idp:Describe*',
                'cognito-idp:AdminGetDevice',
                'cognito-idp:AdminGetUser',
                'cognito-sync:Describe*',
                'cognito-sync:Get*',
              ],
              Effect: 'Allow',
              Resource: `${userpool.userPoolArn}`,
            },
            {
              Action: [
                'cognito-identity:List*',
                'cognito-idp:AdminList*',
                'cognito-idp:List*',
                'cognito-sync:List*',
                'iam:ListOpenIdConnectProviders',
                'iam:ListRoles',
                'sns:ListPlatformApplications',
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
