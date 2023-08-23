import { beforeEach, describe, it, mock } from 'node:test';
import { Func } from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import {
  NestedStackResolver,
  SingletonConstructContainer,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend/test-utils';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
} from '@aws-amplify/plugin-types';
import assert from 'node:assert';
import { fileURLToPath } from 'url';

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
    const functionFactory = Func.fromDir({
      name: 'testFunc',
      codePath: '../test-assets/test-lambda',
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
    ).getInstance({ constructContainer, outputStorageStrategy });

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
