import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { Stack } from 'aws-cdk-lib';
import { Function, IFunction } from 'aws-cdk-lib/aws-lambda';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
} from '@aws-amplify/plugin-types';
import { FunctionInput } from './types.js';
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
import { Func } from '@aws-amplify/backend-function';
import path from 'path';

void describe('buildConstructFactoryFunctionInstanceProvider', () => {
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let functionInstanceProvider: FunctionInstanceProvider;

  beforeEach(() => {
    const stack = new Stack();
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

  void it('provides for an IFunction', () => {
    const myFn = Function.fromFunctionName(new Stack(), 'MyFn', 'MyFnName');

    const providedFn = functionInstanceProvider.provide(myFn);

    assert.equal(myFn, providedFn);
  });

  void it('provides for an AmplifyFunctionFactory', async () => {
    const myFn = Func.fromDir({
      name: 'MyFn',
      codePath: path.join('..', 'test-assets', 'test-lambda'),
    });

    const providedFn = functionInstanceProvider.provide(myFn);

    assert.equal(providedFn.node.id, 'MyFnLambdaFunction');
  });
});

void describe('convertFunctionNameMapToCDK', () => {
  const functionInstanceProvider = {
    provide: mock.fn((func: FunctionInput) => func as unknown as IFunction),
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
    const echo = Function.fromFunctionName(stack, 'EchoFunc', 'MyEchoFunc');
    const updateRecord = Function.fromFunctionName(
      stack,
      'UpdateFunc',
      'MyUpdateFunc'
    );

    const convertedOutput = convertFunctionNameMapToCDK(
      functionInstanceProvider,
      {
        echo,
        updateRecord,
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
      updateRecord
    );
  });
});
