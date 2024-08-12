import { beforeEach, describe, it, mock } from 'node:test';
import { defineStorage } from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ImportPathVerifier,
  ResourceNameValidator,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  ImportPathVerifierStub,
  ResourceNameValidatorStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import { StorageResources } from './construct.js';

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

void describe('AmplifyStorageFactory', () => {
  let storageFactory: ConstructFactory<ResourceProvider<StorageResources>>;
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let importPathVerifier: ImportPathVerifier;
  let resourceNameValidator: ResourceNameValidator;

  let getInstanceProps: ConstructFactoryGetInstanceProps;

  beforeEach(() => {
    storageFactory = defineStorage({ name: 'testName' });
    const stack = createStackAndSetContext();

    constructContainer = new ConstructContainerStub(
      new StackResolverStub(stack)
    );

    outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    importPathVerifier = new ImportPathVerifierStub();

    resourceNameValidator = new ResourceNameValidatorStub();

    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
      resourceNameValidator,
    };
  });
  void it('returns singleton instance', () => {
    const instance1 = storageFactory.getInstance(getInstanceProps);
    const instance2 = storageFactory.getInstance(getInstanceProps);

    assert.strictEqual(instance1, instance2);
  });

  void it('adds construct to stack', () => {
    const storageConstruct = storageFactory.getInstance(getInstanceProps);

    const template = Template.fromStack(
      Stack.of(storageConstruct.resources.bucket)
    );

    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  void it('sets output in storage strategy', () => {
    const storeOutputMock = mock.fn();

    const outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry> =
      {
        addBackendOutputEntry: storeOutputMock,
        appendToBackendOutputList: storeOutputMock,
      };

    storageFactory.getInstance({
      ...getInstanceProps,
      outputStorageStrategy,
    });

    assert.strictEqual(storeOutputMock.mock.callCount(), 1);
  });

  void it('verifies constructor import path', () => {
    const importPathVerifier = {
      verify: mock.fn(),
    };

    storageFactory.getInstance({
      ...getInstanceProps,
      importPathVerifier,
    });

    storageFactory.getInstance(getInstanceProps);

    assert.ok(
      (importPathVerifier.verify.mock.calls[0].arguments[0] as string).includes(
        'defineStorage'
      )
    );
  });

  void it('throws on invalid name', () => {
    const resourceNameValidator = {
      validate: () => {
        throw new Error(
          'Resource name contains invalid characters, found !$87++|'
        );
      },
    };

    const storageFactory = defineStorage({ name: '!$87++|' });
    assert.throws(
      () =>
        storageFactory.getInstance({
          ...getInstanceProps,
          resourceNameValidator,
        }),
      {
        message: 'Resource name contains invalid characters, found !$87++|',
      }
    );
  });
});
