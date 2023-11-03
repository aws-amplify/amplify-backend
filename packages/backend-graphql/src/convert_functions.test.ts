import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { Stack } from 'aws-cdk-lib';
import { Code, Function, IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import {
  AmplifyFunction,
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ConstructFactory,
} from '@aws-amplify/plugin-types';
import {
  FunctionInstanceProvider,
  buildConstructFactoryFunctionInstanceProvider,
  convertFunctionNameMapToCDK,
} from './convert_functions.js';
import {
  ConstructContainerStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';

void describe('buildConstructFactoryFunctionInstanceProvider', () => {
  let stack: Stack;
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let functionInstanceProvider: FunctionInstanceProvider;

  beforeEach(() => {
    stack = new Stack();
    const stackResolverStub = new StackResolverStub(stack);
    constructContainer = new ConstructContainerStub(stackResolverStub);
    outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );
    functionInstanceProvider = buildConstructFactoryFunctionInstanceProvider({
      constructContainer,
      outputStorageStrategy,
    });
  });

  void it('provides for an AmplifyFunctionFactory', async () => {
    const originalFn = new Function(stack, 'MyFnLambdaFunction', {
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromInline(
        'module.handler = async () => console.log("Hello");'
      ),
      handler: 'index.handler',
    });
    const myFn: ConstructFactory<AmplifyFunction> = {
      getInstance: () => ({
        resources: {
          lambda: originalFn,
        },
      }),
    };

    assert.deepStrictEqual(functionInstanceProvider.provide(myFn), originalFn);
  });
});

void describe('convertFunctionNameMapToCDK', () => {
  const functionInstanceProvider = {
    provide: mock.fn(
      (func: ConstructFactory<AmplifyFunction>) => func as unknown as IFunction
    ),
  };

  void it('can be invoked with empty input', () => {
    const convertedOutput = convertFunctionNameMapToCDK(
      functionInstanceProvider,
      {}
    );

    assert.equal(Object.keys(convertedOutput).length, 0);
    assert.equal(functionInstanceProvider.provide.mock.calls.length, 0);
  });

  void it('can be invoked with input entries, and invokes factoryInstanceProvider', () => {
    const stack = new Stack();
    const echoFn = new Function(stack, 'EchoFn', {
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromInline(
        'module.handler = async () => console.log("Hello");'
      ),
      handler: 'index.handler',
    });
    const echo: ConstructFactory<AmplifyFunction> = {
      getInstance: () => ({
        resources: {
          lambda: echoFn,
        },
      }),
    };
    const updateFn = new Function(stack, 'UpdateFn', {
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromInline(
        'module.handler = async () => console.log("Hello");'
      ),
      handler: 'index.handler',
    });
    const update: ConstructFactory<AmplifyFunction> = {
      getInstance: () => ({
        resources: {
          lambda: updateFn,
        },
      }),
    };

    const convertedOutput = convertFunctionNameMapToCDK(
      functionInstanceProvider,
      {
        echo,
        update,
      }
    );

    assert.equal(Object.keys(convertedOutput).length, 2);
    assert.equal(functionInstanceProvider.provide.mock.calls.length, 2);
    assert.equal(
      functionInstanceProvider.provide.mock.calls[0].arguments[0],
      echo
    );
    assert.equal(
      functionInstanceProvider.provide.mock.calls[1].arguments[0],
      update
    );
  });
});
