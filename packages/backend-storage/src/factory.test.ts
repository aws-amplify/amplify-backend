import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyStorageFactory } from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
  DeepBackendSecretResolver,
  NestedStackResolver,
  SingletonConstructContainer,
  StackMetadataBackendOutputStorageStrategy,
  ToggleableImportPathVerifier,
} from '@aws-amplify/backend/test-utils';
import assert from 'node:assert';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  BackendSecretResolver,
  ConstructContainer,
  ConstructFactoryGetInstanceProps,
  ImportPathVerifier,
} from '@aws-amplify/plugin-types';

describe('AmplifyStorageFactory', () => {
  let storageFactory: AmplifyStorageFactory;
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let importPathVerifier: ImportPathVerifier;
  let backendSecretResolver: BackendSecretResolver;
  let getInstanceProps: ConstructFactoryGetInstanceProps;
  beforeEach(() => {
    storageFactory = new AmplifyStorageFactory({});

    const app = new App();
    const stack = new Stack(app);

    constructContainer = new SingletonConstructContainer(
      new NestedStackResolver(stack)
    );

    outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    importPathVerifier = new ToggleableImportPathVerifier(false);

    backendSecretResolver = new DeepBackendSecretResolver(stack, {
      backendId: 'testBackendId',
      branchName: 'testBranchName',
    });

    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
      backendSecretResolver,
    };
  });
  it('returns singleton instance', () => {
    const instance1 = storageFactory.getInstance(getInstanceProps);
    const instance2 = storageFactory.getInstance(getInstanceProps);

    assert.strictEqual(instance1, instance2);
  });

  it('adds construct to stack', () => {
    const storageConstruct = storageFactory.getInstance(getInstanceProps);

    const template = Template.fromStack(Stack.of(storageConstruct));

    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  it('sets output in storage strategy', () => {
    const storeOutputMock = mock.fn();

    const outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry> =
      {
        addBackendOutputEntry: storeOutputMock,
        flush: mock.fn(),
      };

    const importPathVerifier = new ToggleableImportPathVerifier(false);

    storageFactory.getInstance({
      outputStorageStrategy,
      constructContainer,
      importPathVerifier,
      backendSecretResolver,
    });

    assert.strictEqual(storeOutputMock.mock.callCount(), 1);
  });

  it('verifies constructor import path', () => {
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
        'AmplifyStorageFactory'
      )
    );
  });
});
