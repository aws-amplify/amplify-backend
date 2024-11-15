import { Construct } from 'constructs';
import { after, describe, it } from 'node:test';
import { FunctionEnvironmentTranslator } from './function_env_translator.js';
import {
  BackendIdentifier,
  BackendSecret,
  BackendSecretResolver,
  ResolvePathResult,
} from '@aws-amplify/plugin-types';
import { App, SecretValue, Stack } from 'aws-cdk-lib';
import assert from 'node:assert';
import { ParameterPathConversions } from '@aws-amplify/platform-core';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Template } from 'aws-cdk-lib/assertions';
import { FunctionEnvironmentTypeGenerator } from './function_env_type_generator.js';
import path from 'node:path';
import fsp from 'fs/promises';

const testStack = {} as Construct;

const testBackendIdentifier: BackendIdentifier = {
  namespace: 'testBackendId',
  name: 'testBranchName',
  type: 'branch',
};

const testLambdaName = 'testFunction';

class TestBackendSecretResolver implements BackendSecretResolver {
  resolveSecret = (backendSecret: BackendSecret): SecretValue => {
    return backendSecret.resolve(testStack, testBackendIdentifier);
  };
  resolvePath = (backendSecret: BackendSecret): ResolvePathResult => {
    return backendSecret.resolvePath(testBackendIdentifier);
  };
}

class TestBackendSecret implements BackendSecret {
  constructor(private readonly secretName: string) {}
  resolve = (): SecretValue => {
    return SecretValue.unsafePlainText(this.secretName);
  };
  resolvePath = (): ResolvePathResult => {
    return {
      branchSecretPath: ParameterPathConversions.toParameterFullPath(
        testBackendIdentifier,
        this.secretName
      ),
      sharedSecretPath: ParameterPathConversions.toParameterFullPath(
        testBackendIdentifier.namespace,
        this.secretName
      ),
    };
  };
}

void describe('FunctionEnvironmentTranslator', () => {
  const backendResolver = new TestBackendSecretResolver();

  after(async () => {
    // clean up generated env files
    await fsp.rm(path.join(process.cwd(), '.amplify'), {
      recursive: true,
      force: true,
    });
  });

  void it('translates env props that do not contain secrets', () => {
    const functionEnvProp = {
      TEST_VAR: 'testValue',
    };

    const testLambda = getTestLambda();

    new FunctionEnvironmentTranslator(
      testLambda,
      functionEnvProp,
      backendResolver,
      new FunctionEnvironmentTypeGenerator(testLambdaName)
    );

    const template = Template.fromStack(Stack.of(testLambda));
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          AMPLIFY_SSM_ENV_CONFIG: '{}',
          TEST_VAR: 'testValue',
        },
      },
    });
  });

  void it('translates env props that are secrets', () => {
    const functionEnvProp = {
      TEST_VAR: 'testValue',
      TEST_SECRET: new TestBackendSecret('secretValue'),
    };

    const testLambda = getTestLambda();

    new FunctionEnvironmentTranslator(
      testLambda,
      functionEnvProp,
      backendResolver,
      new FunctionEnvironmentTypeGenerator(testLambdaName)
    );

    const template = Template.fromStack(Stack.of(testLambda));

    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          AMPLIFY_SSM_ENV_CONFIG: JSON.stringify({
            '/amplify/testBackendId/testBranchName-branch-e482a1c36f/secretValue':
              {
                name: 'TEST_SECRET',
                sharedPath: '/amplify/shared/testBackendId/secretValue',
              },
          }),
          TEST_SECRET: '<value will be resolved during runtime>',
          TEST_VAR: 'testValue',
        },
      },
    });
  });

  void it('throws on undefined env var entries', () => {
    const functionEnvProp = {
      TEST_UNDEFINED: undefined as unknown as string,
      TEST_DEFINED: 'hello',
    };

    const testLambda = getTestLambda();

    assert.throws(
      () => {
        new FunctionEnvironmentTranslator(
          testLambda,
          functionEnvProp,
          backendResolver,
          new FunctionEnvironmentTypeGenerator(testLambdaName)
        );
      },
      {
        name: 'InvalidFunctionConfigurationError',
      }
    );
  });

  void it('throws if function prop contains a reserved env name', () => {
    const functionEnvProp = {
      AMPLIFY_SSM_ENV_CONFIG: 'test',
    };

    assert.throws(
      () =>
        new FunctionEnvironmentTranslator(
          getTestLambda(),
          functionEnvProp,
          backendResolver,
          new FunctionEnvironmentTypeGenerator(testLambdaName)
        )
    );
  });

  void it('does not add SSM policy if no ssm paths are present', () => {
    const functionEnvProp = {
      TEST_VAR: 'testValue',
    };

    const testLambda = getTestLambda();

    new FunctionEnvironmentTranslator(
      testLambda,
      functionEnvProp,
      backendResolver,
      new FunctionEnvironmentTypeGenerator(testLambdaName)
    );

    const template = Template.fromStack(Stack.of(testLambda));
    template.resourceCountIs('AWS::IAM::Policy', 0);
  });

  void it('grants SSM read permissions for secret paths', () => {
    const functionEnvProp = {
      TEST_VAR: 'testValue',
      TEST_SECRET: new TestBackendSecret('secretValue'),
    };

    const testLambda = getTestLambda();

    new FunctionEnvironmentTranslator(
      testLambda,
      functionEnvProp,
      backendResolver,
      new FunctionEnvironmentTypeGenerator(testLambdaName)
    );

    const template = Template.fromStack(Stack.of(testLambda));

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
});

const getTestLambda = () =>
  new Function(new Stack(new App()), testLambdaName, {
    code: Code.fromInline('test code'),
    runtime: Runtime.NODEJS_20_X,
    handler: 'handler',
  });
