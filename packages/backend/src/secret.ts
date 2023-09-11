import { BackendSecret } from '@aws-amplify/plugin-types';
import { CfnTokenBackendSecret } from './engine/backend-secret/backend_secret.js';
import { SecretClient } from '@aws-amplify/backend-secret';
import { BackendSecretResourceProviderFactory } from './engine/backend-secret/backend_secret_resource_provider_factory.js';
import { BackendSecretResourceFactory } from './engine/backend-secret/backend_secret_resource_factory.js';

/**
 * Factory function for initializing a backend secret.
 */
export const secret = (name: string): BackendSecret => {
  const secretProviderFactory = new BackendSecretResourceProviderFactory(
    SecretClient()
  );
  const secretResourceFactory = new BackendSecretResourceFactory(
    secretProviderFactory
  );
  return new CfnTokenBackendSecret(name, secretResourceFactory);
};
