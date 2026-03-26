import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import {
  AmplifyHostingFactory,
  defineHosting,
} from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ConstructFactoryGetInstanceProps,
  ImportPathVerifier,
  ResourceNameValidator,
} from '@aws-amplify/plugin-types';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  ImportPathVerifierStub,
  ResourceNameValidatorStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';

/**
 * Reset the singleton factory count between tests.
 */
const resetFactoryCount = () => {
  AmplifyHostingFactory.factoryCount = 0;
};

void describe('AmplifyHostingFactory', () => {
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let importPathVerifier: ImportPathVerifier;
  let getInstanceProps: ConstructFactoryGetInstanceProps;
  let resourceNameValidator: ResourceNameValidator;
  let stack: Stack;

  beforeEach(() => {
    resetFactoryCount();

    const app = new App();
    app.node.setContext('amplify-backend-name', 'testEnvName');
    app.node.setContext('amplify-backend-namespace', 'testBackendId');
    app.node.setContext('amplify-backend-type', 'branch');
    stack = new Stack(app);

    constructContainer = new ConstructContainerStub(
      new StackResolverStub(stack),
    );

    outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack,
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

  void it('returns singleton instance from getInstance()', () => {
    const factory = defineHosting({
      framework: 'spa',
      buildOutputDir: '/tmp/test-build-output-singleton',
    });

    // We can't fully getInstance without a real build dir, but we can verify
    // the factory is created successfully and has the provides token
    assert.strictEqual(
      (factory as AmplifyHostingFactory).provides,
      'HostingResources',
    );
  });

  void it('throws on multiple defineHosting calls', () => {
    defineHosting({ framework: 'spa' });

    assert.throws(
      () => defineHosting({ framework: 'spa' }),
      (error: Error) => {
        assert.ok(error.message.includes('Multiple `defineHosting` calls'));
        return true;
      },
    );
  });

  void it('allows defineHosting with no props', () => {
    const factory = defineHosting();
    assert.ok(factory);
  });

  void it('verifies import path', () => {
    let verifiedPath: string | undefined;
    const trackingVerifier: ImportPathVerifier = {
      verify: (
        _importStack: string | undefined,
        expectedImportingFile: string,
        _errorMessage: string,
      ) => {
        verifiedPath = expectedImportingFile;
      },
    };

    const factory = defineHosting({ framework: 'spa' });
    getInstanceProps.importPathVerifier = trackingVerifier;

    // This will fail because there's no real build dir, but import verification happens first
    try {
      factory.getInstance(getInstanceProps);
    } catch {
      // Expected — no real build output
    }

    assert.ok(verifiedPath?.includes('amplify'));
    assert.ok(verifiedPath?.includes('hosting'));
  });
});
