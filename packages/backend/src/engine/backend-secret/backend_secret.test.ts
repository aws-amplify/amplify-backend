import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { CfnTokenBackendSecret } from './backend_secret.js';
import { App, SecretValue, Stack } from 'aws-cdk-lib';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { SecretClient } from '@aws-amplify/backend-secret';
import { BackendSecretResourceProviderFactory } from './backend_secret_resource_provider_factory.js';
import { BackendSecretResourceFactory } from './backend_secret_resource_factory.js';

const backendId = 'testId';
const branchName = 'testBranch';
const testSecretName = 'testSecretName';
const testSecretValue = 'testSecretValue';
const uniqueBackendIdentifier: UniqueBackendIdentifier = {
  backendId,
  branchName,
};

describe('BackendSecret', () => {
  const providerFactory = new BackendSecretResourceProviderFactory(
    SecretClient()
  );
  const resourceFactory = new BackendSecretResourceFactory(providerFactory);

  it('resolves a secret', () => {
    const mockGetOrCreate = mock.method(resourceFactory, 'getOrCreate', () => {
      return {
        getAttString: (): string => testSecretValue,
      };
    });

    const app = new App();
    const stack = new Stack(app);
    const secret = new CfnTokenBackendSecret(testSecretName, resourceFactory);
    const val = secret.resolve(stack, uniqueBackendIdentifier);
    assert.deepStrictEqual(val, new SecretValue(testSecretValue));
    assert.deepStrictEqual(mockGetOrCreate.mock.callCount(), 1);
  });
});
