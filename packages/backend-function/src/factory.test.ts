import { beforeEach, describe, it, mock } from 'node:test';
import { Func } from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import { ConstructFactoryGetInstanceProps } from '@aws-amplify/plugin-types';
import assert from 'node:assert';
import { fileURLToPath } from 'url';
import * as path from 'path';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

void describe('AmplifyFunctionFactory', () => {
  let getInstanceProps: ConstructFactoryGetInstanceProps;

  beforeEach(() => {
    const stack = createStackAndSetContext();

    const constructContainer = new ConstructContainerStub(
      new StackResolverStub(stack)
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
    };
  });

  void it('creates singleton function instance', () => {
    const functionFactory = Func.fromDir({
      name: 'testFunc',
      codePath: path.join('..', 'test-assets', 'test-lambda'),
    });
    const instance1 = functionFactory.getInstance(getInstanceProps);
    const instance2 = functionFactory.getInstance(getInstanceProps);
    assert.strictEqual(instance1, instance2);
  });

  void it('executes build command from directory where constructor is used', async () => {
    const commandExecutorMock = mock.fn();

    // Casting to never is necessary because commandExecutor is a private method.
    // TS yells that it's not a property on Func even though it is there
    mock.method(Func, 'commandExecutor' as never, commandExecutorMock);

    (
      await Func.build({
        name: 'testFunc',
        outDir: path.join('..', 'test-assets', 'test-lambda'),
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
