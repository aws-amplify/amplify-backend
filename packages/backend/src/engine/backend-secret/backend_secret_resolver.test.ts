import { describe, it, mock } from 'node:test';
import { DefaultBackendSecretResolver } from './backend_secret_resolver.js';
import { CfnTokenBackendSecret } from './backend_secret.js';
import { BackendSecretFetcherFactory } from './backend_secret_fetcher_factory.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { App, Stack } from 'aws-cdk-lib';
import assert from 'node:assert';

void describe('DefaultBackendSecretResolver', () => {
  const testBackendIdentifier: BackendIdentifier = {
    type: 'branch',
    namespace: 'testBackendId',
    name: 'testBranchName',
  };
  const app = new App();
  const stack = new Stack(app);

  void it('resolves a backend secret', () => {
    const testSecretName = 'testSecretName';
    const testSecret = new CfnTokenBackendSecret(
      testSecretName,
      {} as BackendSecretFetcherFactory
    );
    const mockResolve = mock.method(testSecret, 'resolve', () => true);
    const resolver = new DefaultBackendSecretResolver(
      stack,
      testBackendIdentifier
    );
    resolver.resolveSecret(testSecret);
    assert.equal(mockResolve.mock.callCount(), 1);
    assert.equal(mockResolve.mock.calls[0].arguments[0], stack);
    assert.equal(mockResolve.mock.calls[0].arguments[1], testBackendIdentifier);
  });
});
