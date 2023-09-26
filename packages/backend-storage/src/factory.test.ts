import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyStorageFactory } from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
  NestedStackResolver,
  SingletonConstructContainer,
  ToggleableImportPathVerifier,
} from '@aws-amplify/backend/test-utils';
import assert from 'node:assert';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ConstructFactoryGetInstanceProps,
  ImportPathVerifier,
} from '@aws-amplify/plugin-types';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';

void describe('AmplifyStorageFactory', () => {
  let storageFactory: AmplifyStorageFactory;
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let importPathVerifier: ImportPathVerifier;
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

    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
    };
  });
  void it('returns singleton instance', () => {
    const instance1 = storageFactory.getInstance(getInstanceProps);
    const instance2 = storageFactory.getInstance(getInstanceProps);

    assert.strictEqual(instance1, instance2);
  });

  void it('adds construct to stack', () => {
    const storageConstruct = storageFactory.getInstance(getInstanceProps);

    const template = Template.fromStack(Stack.of(storageConstruct));

    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  void it('sets output in storage strategy', () => {
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
        'AmplifyStorageFactory'
      )
    );
  });
});
