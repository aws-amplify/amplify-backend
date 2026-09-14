import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { CfnTokenBackendSecret } from './backend_secret.js';
import { App, SecretValue, Stack } from 'aws-cdk-lib';
import { BackendSecretFetcherProviderFactory } from './backend_secret_fetcher_provider_factory.js';
import { BackendSecretFetcherFactory } from './backend_secret_fetcher_factory.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

const namespace = 'testId';
const name = 'testBranch';
const testSecretName = 'testSecretName';
const testSecretValue = 'testSecretValue';
const backendId: BackendIdentifier = {
  namespace,
  name,
  type: 'branch',
};

void describe('BackendSecret', () => {
  const providerFactory = new BackendSecretFetcherProviderFactory();
  const resourceFactory = new BackendSecretFetcherFactory(providerFactory);

  void it('resolves a secret', () => {
    const mockGetOrCreate = mock.method(resourceFactory, 'getOrCreate', () => {
      return {
        getAttString: (): string => testSecretValue,
      };
    });

    const app = new App();
    const stack = new Stack(app);
    const secret = new CfnTokenBackendSecret(testSecretName, resourceFactory);
    const val = secret.resolve(stack, backendId);
    assert.deepStrictEqual(val, SecretValue.unsafePlainText(testSecretValue));
    assert.deepStrictEqual(mockGetOrCreate.mock.callCount(), 1);
  });
});
