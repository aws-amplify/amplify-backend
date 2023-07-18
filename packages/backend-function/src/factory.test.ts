import { beforeEach, describe, it } from 'node:test';
import { AmplifyFunctionFactory } from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import {
  NestedStackResolver,
  SingletonConstructContainer,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend-engine';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
} from '@aws-amplify/plugin-types';
import assert from 'node:assert';
import * as fs from 'fs';

describe('AmplifyFunctionFactory', () => {
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;

  beforeEach(() => {
    const app = new App();
    const stack = new Stack(app, 'testStack');

    constructContainer = new SingletonConstructContainer(
      new NestedStackResolver(stack)
    );

    outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );
  });

  it('creates singleton function instance', () => {
    const functionFactory = new AmplifyFunctionFactory({
      name: 'testFunc',
      codeLocation: '../test-assets/test-lambda',
    });
    const instance1 = functionFactory.getInstance({
      constructContainer,
      outputStorageStrategy,
    });
    const instance2 = functionFactory.getInstance({
      constructContainer,
      outputStorageStrategy,
    });
    assert.strictEqual(instance1, instance2);
  });

  it('executes build command from directory where constructor is used', () => {
    // the build command creates a test.txt file.
    // We use the existence of this file as an indicator that the build command ran successfully
    const relativeTestFileLocation = '../test.txt';

    new AmplifyFunctionFactory({
      name: 'testFunc',
      codeLocation: '../test-assets/test-lambda',
      buildCommand: `touch ${relativeTestFileLocation}`,
    }).getInstance({ constructContainer, outputStorageStrategy });

    const testFilePath = new URL(relativeTestFileLocation, import.meta.url);

    assert.ok(fs.existsSync(testFilePath));

    fs.unlinkSync(testFilePath);
  });
});
