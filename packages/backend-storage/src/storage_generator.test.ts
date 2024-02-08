import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { StorageGenerator } from './storage_generator.js';
import {
  ConstructContainerStub,
  ImportPathVerifierStub,
  SsmEnvironmentEntriesGeneratorStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import {
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  SsmEnvironmentEntriesGenerator,
} from '@aws-amplify/plugin-types';
import { App, Stack } from 'aws-cdk-lib';
import { BucketPolicyArbiterFactory } from './policy_arbiter.js';
import { AmplifyStorage } from './construct.js';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';

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
      const storageGenerator = new StorageGenerator(
        { name: 'testName' },
        getInstanceProps,
        new BucketPolicyArbiterFactory()
      );

      const storageInstance = storageGenerator.generateContainerEntry(
        generateContainerEntryProps
      );

      assert.ok(storageInstance instanceof AmplifyStorage);
    });

    void it('invokes the policy arbiter if access is defined', () => {
      const arbitratePoliciesMock = mock.fn();
      const bucketPolicyArbiterFactory = new BucketPolicyArbiterFactory();
      mock.method(bucketPolicyArbiterFactory, 'getInstance', () => ({
        arbitratePolicies: arbitratePoliciesMock,
      }));
      const storageGenerator = new StorageGenerator(
        {
          name: 'testName',
          access: (allow) => ({
            '/test/*': [
              allow.authenticated.to('read', 'write'),
              allow.guest.to('read'),
            ],
          }),
        },
        getInstanceProps,
        bucketPolicyArbiterFactory
      );

      storageGenerator.generateContainerEntry(generateContainerEntryProps);

      assert.equal(arbitratePoliciesMock.mock.callCount(), 1);
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
