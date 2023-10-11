import { BackendSecret } from '@aws-amplify/plugin-types';
import { CfnTokenBackendSecret } from './engine/backend-secret/backend_secret.js';
import { BackendSecretFetcherProviderFactory } from './engine/backend-secret/backend_secret_fetcher_provider_factory.js';
import { BackendSecretFetcherFactory } from './engine/backend-secret/backend_secret_fetcher_factory.js';

/**
 * Factory function for initializing a backend secret.
 */
export const secret = (name: string): BackendSecret => {
  const secretProviderFactory = new BackendSecretFetcherProviderFactory();
  const secretResourceFactory = new BackendSecretFetcherFactory(
    secretProviderFactory
  );
  return new CfnTokenBackendSecret(name, secretResourceFactory);
};
