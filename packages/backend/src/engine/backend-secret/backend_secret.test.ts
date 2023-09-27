import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { CfnTokenBackendSecret } from './backend_secret.js';
import { App, SecretValue, Stack } from 'aws-cdk-lib';
import {
  BranchBackendIdentifier,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-core';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { BackendSecretFetcherProviderFactory } from './backend_secret_fetcher_provider_factory.js';
import { BackendSecretFetcherFactory } from './backend_secret_fetcher_factory.js';

const backendId = 'testId';
const branchName = 'testBranch';
const testSecretName = 'testSecretName';
const testSecretValue = 'testSecretValue';
const uniqueBackendIdentifier: UniqueBackendIdentifier =
  new BranchBackendIdentifier(backendId, branchName);

void describe('BackendSecret', () => {
  const providerFactory = new BackendSecretFetcherProviderFactory(
    getSecretClient()
  );
  const resourceFactory = new BackendSecretFetcherFactory(providerFactory);

  void it('resolves a secret', () => {
    const mockGetOrCreate = mock.method(resourceFactory, 'getOrCreate', () => {
      return {
        getAttString: (): string => testSecretValue,
      };
    });

    const app = new App();
    const stack = new Stack(app);
    const secret = new CfnTokenBackendSecret(
      testSecretName,
      1,
      resourceFactory
    );
    const val = secret.resolve(stack, uniqueBackendIdentifier);
    assert.deepStrictEqual(val, new SecretValue(testSecretValue));
    assert.deepStrictEqual(mockGetOrCreate.mock.callCount(), 1);
  });
});
