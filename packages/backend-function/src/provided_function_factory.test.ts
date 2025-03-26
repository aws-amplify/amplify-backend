import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  ResourceNameValidatorStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import {
  BackendIdentifier,
  BackendSecret,
  ConstructFactoryGetInstanceProps,
  ResolvePathResult,
  ResourceNameValidator,
} from '@aws-amplify/plugin-types';
import { App, SecretValue, Stack } from 'aws-cdk-lib';
import { beforeEach, describe, it } from 'node:test';
import { providedNodeLambda } from './test-assets/provided-node-lambda/resource.js';
import { Template } from 'aws-cdk-lib/assertions';
import { defineFunction } from './factory.js';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { ParameterPathConversions } from '@aws-amplify/platform-core';
import assert from 'node:assert';
import { amplifySsmEnvConfigKey } from './constants.js';

const testBackendIdentifier: BackendIdentifier = {
  namespace: 'testBackendId',
  name: 'testBranchName',
  type: 'branch',
};

class TestBackendSecret implements BackendSecret {
  constructor(private readonly secretName: string) {}
  resolve = (): SecretValue => {
    return SecretValue.unsafePlainText(this.secretName);
  };
  resolvePath = (): ResolvePathResult => {
    return {
      branchSecretPath: ParameterPathConversions.toParameterFullPath(
        testBackendIdentifier,
        this.secretName,
      ),
      sharedSecretPath: ParameterPathConversions.toParameterFullPath(
        testBackendIdentifier.namespace,
        this.secretName,
      ),
    };
  };
}

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

void describe('ProvidedFunctionFactory', () => {
  let rootStack: Stack;
  let getInstanceProps: ConstructFactoryGetInstanceProps;
  let resourceNameValidator: ResourceNameValidator;

  beforeEach(() => {
    rootStack = createStackAndSetContext();

    const constructContainer = new ConstructContainerStub(
      new StackResolverStub(rootStack),
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      rootStack,
    );

    resourceNameValidator = new ResourceNameValidatorStub();

    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
      resourceNameValidator,
    };
  });

  void it('allows adding environment variables after defining the function', () => {
    const functionFactory = providedNodeLambda;
    const lambda = functionFactory.getInstance(getInstanceProps);
    lambda.addEnvironment('key1', 'value1');
    const template = Template.fromStack(lambda.stack);
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          key1: 'value1',
        },
      },
    });
  });

  void it('allows adding environment variables that are secrets after defining the function', () => {
    const functionFactory = providedNodeLambda;
    const lambda = functionFactory.getInstance(getInstanceProps);
    lambda.addEnvironment('testSecret', new TestBackendSecret('secretValue'));
    const template = Template.fromStack(lambda.stack);
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          AMPLIFY_SSM_ENV_CONFIG: JSON.stringify({
            testSecret: {
              path: '/amplify/testBackendId/testBranchName-branch-e482a1c36f/secretValue',
              sharedPath: '/amplify/shared/testBackendId/secretValue',
            },
          }),
          testSecret: '<value will be resolved during runtime>',
        },
      },
    });
  });

  void it('adding environment variables after defining the function does not override existing environment variables', () => {
    const functionFactory = defineFunction((scope) => {
      return new NodejsFunction(scope, 'testNodeProvidedFunction', {
        entry:
          './packages/backend-function/src/test-assets/provided-node-lambda/handler.ts',
        environment: {
          EXISTING_KEY: 'existing value',
        },
      });
    });
    const lambda = functionFactory.getInstance(getInstanceProps);
    lambda.addEnvironment('key1', 'value1');
    lambda.addEnvironment('testSecret', new TestBackendSecret('secretValue'));
    const template = Template.fromStack(lambda.stack);
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          AMPLIFY_SSM_ENV_CONFIG: JSON.stringify({
            testSecret: {
              path: '/amplify/testBackendId/testBranchName-branch-e482a1c36f/secretValue',
              sharedPath: '/amplify/shared/testBackendId/secretValue',
            },
          }),
          EXISTING_KEY: 'existing value',
          key1: 'value1',
          testSecret: '<value will be resolved during runtime>',
        },
      },
    });
  });

  void it('does not add SSM policy if no secrets are added as environment variables', () => {
    const functionFactory = providedNodeLambda;
    const lambda = functionFactory.getInstance(getInstanceProps);
    lambda.addEnvironment('key1', 'value1');
    const template = Template.fromStack(lambda.stack);
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.resourceCountIs('AWS::IAM::Policy', 0);
  });

  void it('adds SSM policy if secrets are added as environment variables', () => {
    const functionFactory = providedNodeLambda;
    const lambda = functionFactory.getInstance(getInstanceProps);
    lambda.addEnvironment('testSecret', new TestBackendSecret('secretValue'));
    const template = Template.fromStack(lambda.stack);
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.resourceCountIs('AWS::IAM::Policy', 1);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Effect: 'Allow',
            Action: 'ssm:GetParameters',
            Resource: [
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':ssm:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':parameter/amplify/testBackendId/testBranchName-branch-e482a1c36f/secretValue',
                  ],
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':ssm:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':parameter/amplify/shared/testBackendId/secretValue',
                  ],
                ],
              },
            ],
          },
        ],
      },
    });
  });

  void it('throws if adding an environment variable using a reserved name', () => {
    const functionFactory = providedNodeLambda;
    const lambda = functionFactory.getInstance(getInstanceProps);

    assert.throws(() => lambda.addEnvironment(amplifySsmEnvConfigKey, 'test'), {
      name: 'ReservedFunctionEnvironmentVariableError',
    });
  });
});
