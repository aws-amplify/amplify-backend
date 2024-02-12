import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { StorageContainerEntryGenerator } from './storage_container_entry_generator.js';
import {
  ConstructContainerStub,
  ImportPathVerifierStub,
  SsmEnvironmentEntriesGeneratorStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import {
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
  SsmEnvironmentEntriesGenerator,
} from '@aws-amplify/plugin-types';
import { App, Stack } from 'aws-cdk-lib';
import { BucketPolicyArbiterFactory } from './policy_arbiter.js';
import { AmplifyStorage } from './construct.js';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import { RoleAccessBuilder } from './access_builder.js';

void describe('StorageGenerator', () => {
  void describe('generateContainerEntry', () => {
    let getInstanceProps: ConstructFactoryGetInstanceProps;
    let stack: Stack;
    let ssmEnvironmentEntriesGenerator: SsmEnvironmentEntriesGenerator;
    let generateContainerEntryProps: GenerateContainerEntryProps;

    beforeEach(() => {
      stack = createStackAndSetContext();

      ssmEnvironmentEntriesGenerator = new SsmEnvironmentEntriesGeneratorStub(
        stack
      );

      generateContainerEntryProps = {
        scope: stack,
        ssmEnvironmentEntriesGenerator,
      } as unknown as GenerateContainerEntryProps;

      const constructContainer = new ConstructContainerStub(
        new StackResolverStub(stack)
      );

      const outputStorageStrategy =
        new StackMetadataBackendOutputStorageStrategy(stack);

      const importPathVerifier = new ImportPathVerifierStub();

      getInstanceProps = {
        constructContainer,
        outputStorageStrategy,
        importPathVerifier,
      };
    });
    void it('returns AmplifyStorage instance', () => {
      const storageGenerator = new StorageContainerEntryGenerator(
        { name: 'testName' },
        getInstanceProps,
        new BucketPolicyArbiterFactory()
      );

      const storageInstance = storageGenerator.generateContainerEntry(
        generateContainerEntryProps
      );

      assert.ok(storageInstance instanceof AmplifyStorage);
    });

    void it('invokes the policy arbiter with correct accessDefinition if access is defined', () => {
      const arbitratePoliciesMock = mock.fn();
      const bucketPolicyArbiterFactory = new BucketPolicyArbiterFactory();
      const getInstanceMock = mock.method(
        bucketPolicyArbiterFactory,
        'getInstance',
        () => ({
          arbitratePolicies: arbitratePoliciesMock,
        })
      );

      const authenticatedAccessAcceptorMock = mock.fn(() => ({
        acceptResourceAccess: mock.fn(),
      }));
      const guestAccessAcceptorMock = mock.fn(() => ({
        acceptResourceAccess: mock.fn(),
      }));
      const ownerAccessAcceptorMock = mock.fn(() => ({
        acceptResourceAccess: mock.fn(),
      }));
      const resourceAccessAcceptorMock = mock.fn(() => ({
        acceptResourceAccess: mock.fn(),
      }));

      const stubRoleAccessBuilder: RoleAccessBuilder = {
        authenticated: {
          to: (...actions) => ({
            getResourceAccessAcceptor: authenticatedAccessAcceptorMock,
            actions: actions,
            ownerPlaceholderSubstitution: '*',
          }),
        },
        guest: {
          to: (...actions) => ({
            getResourceAccessAcceptor: guestAccessAcceptorMock,
            actions: actions,
            ownerPlaceholderSubstitution: '*',
          }),
        },
        owner: {
          to: (...actions) => ({
            getResourceAccessAcceptor: ownerAccessAcceptorMock,
            actions: actions,
            ownerPlaceholderSubstitution: 'testOwnerSubstitution',
          }),
        },
        resource: () => ({
          to: (...actions) => ({
            getResourceAccessAcceptor: resourceAccessAcceptorMock,
            actions: actions,
            ownerPlaceholderSubstitution: '*',
          }),
        }),
      };

      const storageGenerator = new StorageContainerEntryGenerator(
        {
          name: 'testName',
          access: (allow) => ({
            '/test/*': [
              allow.authenticated.to('read', 'write'),
              allow.guest.to('read'),
              allow.owner.to('read', 'write', 'delete'),
              allow
                .resource(
                  {} as unknown as ConstructFactory<
                    ResourceProvider & ResourceAccessAcceptorFactory
                  >
                )
                .to('read'),
            ],
          }),
        },
        getInstanceProps,
        bucketPolicyArbiterFactory,
        stubRoleAccessBuilder
      );

      storageGenerator.generateContainerEntry(generateContainerEntryProps);

      assert.equal(arbitratePoliciesMock.mock.callCount(), 1);
      assert.deepStrictEqual(getInstanceMock.mock.calls[0].arguments[1], {
        '/test/*': [
          {
            getResourceAccessAcceptor: authenticatedAccessAcceptorMock,
            actions: ['read', 'write'],
            ownerPlaceholderSubstitution: '*',
          },
          {
            getResourceAccessAcceptor: guestAccessAcceptorMock,
            actions: ['read'],
            ownerPlaceholderSubstitution: '*',
          },
          {
            getResourceAccessAcceptor: ownerAccessAcceptorMock,
            actions: ['read', 'write', 'delete'],
            ownerPlaceholderSubstitution: 'testOwnerSubstitution',
          },
          {
            getResourceAccessAcceptor: resourceAccessAcceptorMock,
            actions: ['read'],
            ownerPlaceholderSubstitution: '*',
          },
        ],
      });
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
