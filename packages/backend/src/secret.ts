import { BackendSecret } from '@aws-amplify/plugin-types';
import { CfnTokenBackendSecret } from './engine/backend-secret/backend_secret.js';
import { BackendSecretFetcherProviderFactory } from './engine/backend-secret/backend_secret_fetcher_provider_factory.js';
import { BackendSecretFetcherFactory } from './engine/backend-secret/backend_secret_fetcher_factory.js';

/**
 * Use a secret from AWS Systems Manager (SSM) Parameter Store
 * @todo add docs link for using secrets
 * @todo add docs link for creating secrets in the console
 * @see {@link https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html AWS documentation for SSM Parameter Store}
 * @example <caption>Creating a sandbox secret with the CLI</caption>
 * > amplify sandbox secret set MY_SECRET
 * @example <caption>Using a secret</caption>
 * secret('MY_SECRET')
 */
export const secret = (name: string): BackendSecret => {
  const secretProviderFactory = new BackendSecretFetcherProviderFactory();
  const secretResourceFactory = new BackendSecretFetcherFactory(
    secretProviderFactory
  );
  return new CfnTokenBackendSecret(name, secretResourceFactory);
};
