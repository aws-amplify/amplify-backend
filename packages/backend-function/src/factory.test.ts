import { beforeEach, describe, it, mock } from 'node:test';
import { Func } from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import {
  NestedStackResolver,
  OptionalPassThroughBackendParameterResolver,
  SingletonConstructContainer,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend/test-utils';
import { ConstructFactoryGetInstanceProps } from '@aws-amplify/plugin-types';
import assert from 'node:assert';
import { fileURLToPath } from 'url';

describe('AmplifyFunctionFactory', () => {
  let getInstanceProps: ConstructFactoryGetInstanceProps;

  beforeEach(() => {
    const app = new App();
    const stack = new Stack(app, 'testStack');

    const constructContainer = new SingletonConstructContainer(
      new NestedStackResolver(stack)
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    const backendParameterResolver =
      new OptionalPassThroughBackendParameterResolver(
        stack,
        'backendId',
        'testBranch'
      );

    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
      backendParameterResolver,
    };
  });

  it('creates singleton function instance', () => {
    const functionFactory = Func.fromDir({
      name: 'testFunc',
      codePath: '../test-assets/test-lambda',
    });
    const instance1 = functionFactory.getInstance(getInstanceProps);
    const instance2 = functionFactory.getInstance(getInstanceProps);
    assert.strictEqual(instance1, instance2);
  });

  it('executes build command from directory where constructor is used', async () => {
    const commandExecutorMock = mock.fn();

    // Casting to never is necessary because commandExecutor is a private method.
    // TS yells that it's not a property on Func even though it is there
    mock.method(Func, 'commandExecutor' as never, commandExecutorMock);

    (
      await Func.build({
        name: 'testFunc',
        outDir: '../test-assets/test-lambda',
        buildCommand: 'test command',
      })
    ).getInstance(getInstanceProps);

    assert.strictEqual(commandExecutorMock.mock.callCount(), 1);
    assert.deepStrictEqual(commandExecutorMock.mock.calls[0].arguments, [
      'test command',
      {
        cwd: fileURLToPath(new URL('../src', import.meta.url)),
        stdio: 'inherit',
        shell: 'bash',
      },
    ]);
  });
});
