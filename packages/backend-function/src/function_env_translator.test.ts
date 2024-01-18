import { Construct } from 'constructs';
import { describe, it } from 'node:test';
import { FunctionEnvironmentTranslator } from './function_env_translator.js';
import {
  BackendIdentifier,
  BackendSecret,
  BackendSecretResolver,
  ResolvePathResult,
} from '@aws-amplify/plugin-types';
import { SecretValue } from 'aws-cdk-lib';
import assert from 'node:assert';
import { ParameterPathConversions } from '@aws-amplify/platform-core';

const testStack = {} as Construct;

const testBackendIdentifier: BackendIdentifier = {
  namespace: 'testBackendId',
  name: 'testBranchName',
  type: 'branch',
};

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

void describe('functionEnvironmentTranslator', () => {
  const backendResolver = new TestBackendSecretResolver();

  void it('translates env props that do not contain secrets', () => {
    const functionEnvProp = {
      TEST_VAR: 'testValue',
    };

    const functionEnvironmentTranslator = new FunctionEnvironmentTranslator(
      testStack,
      functionEnvProp,
      backendResolver
    );

    assert.deepEqual(functionEnvironmentTranslator.getEnvironmentRecord(), {
      AMPLIFY_SECRET_PATHS: '{}',
      TEST_VAR: 'testValue',
    });
  });

  void it('translates env props that are secrets', () => {
    const functionEnvProp = {
      TEST_VAR: 'testValue',
      TEST_SECRET: new TestBackendSecret('secretValue'),
    };

    const functionEnvironmentTranslator = new FunctionEnvironmentTranslator(
      testStack,
      functionEnvProp,
      backendResolver
    );

    assert.deepEqual(functionEnvironmentTranslator.getEnvironmentRecord(), {
      AMPLIFY_SECRET_PATHS: JSON.stringify({
        '/amplify/testBackendId/testBranchName-branch-e482a1c36f/secretValue': {
          name: 'TEST_SECRET',
          sharedPath: '/amplify/shared/testBackendId/secretValue',
        },
      }),
      TEST_SECRET: '<value will be resolved during runtime>',
      TEST_VAR: 'testValue',
    });
  });

  void it('throws if function prop contains a reserved env name', () => {
    const functionEnvProp = {
      AMPLIFY_SECRET_PATHS: 'test',
    };
    assert.throws(
      () =>
        new FunctionEnvironmentTranslator(
          testStack,
          functionEnvProp,
          backendResolver
        )
    );
  });
});
