import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Stack } from 'aws-cdk-lib';
import { CfnFunction, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import {
  AmplifyFunction,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
} from '@aws-amplify/plugin-types';
import { convertFunctionNameMapToCDK } from './convert_functions.js';

void describe('convertFunctionNameMapToCDK', () => {
  const getInstancePropsStub =
    {} as unknown as ConstructFactoryGetInstanceProps;

  void it('can be invoked with empty input', () => {
    const convertedOutput = convertFunctionNameMapToCDK(
      getInstancePropsStub,
      {}
    );

    assert.equal(Object.keys(convertedOutput).length, 0);
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
          cfnResources: {
            cfnFunction: echoFn.node.findChild('Resource') as CfnFunction,
          },
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
          cfnResources: {
            cfnFunction: echoFn.node.findChild('Resource') as CfnFunction,
          },
        },
      }),
    };

    const convertedOutput = convertFunctionNameMapToCDK(getInstancePropsStub, {
      echo,
      update,
    });

    assert.equal(Object.keys(convertedOutput).length, 2);
    assert.strictEqual(convertedOutput.echo, echoFn);
    assert.strictEqual(convertedOutput.update, updateFn);
  });
});
