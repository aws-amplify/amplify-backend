import { BackendSecret } from '@aws-amplify/plugin-types';
import { CfnTokenBackendSecret } from './engine/backend-secret/backend_secret.js';
import { BackendSecretFetcherProviderFactory } from './engine/backend-secret/backend_secret_fetcher_provider_factory.js';
import { BackendSecretFetcherFactory } from './engine/backend-secret/backend_secret_fetcher_factory.js';

/**
 * Use a secret from AWS Systems Manager (SSM) Parameter Store
 * @see https://docs.amplify.aws/gen2/deploy-and-host/fullstack-branching/secrets-and-vars/
 * @see {@link https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html AWS documentation for SSM Parameter Store}
 * @example <caption>Creating a sandbox secret with the CLI</caption>
 * > ampx sandbox secret set MY_SECRET
 * @example <caption>Using a secret</caption>
 * secret('MY_SECRET')
 * @example <caption>Using with `defineAuth`</caption>
 *          ```
 *          defineAuth({
 *            loginWith: {
 *              email: {},
 *              externalProviders: {
 *                loginWithAmazon: {
 *                  clientId: secret('LOGIN_WITH_AMAZON_CLIENT_ID'),
 *                  clientSecret: secret('LOGIN_WITH_AMAZON_CLIENT_SECRET'),
 *                },
 *               },
 *             },
 *           })
 *          ```
 */
export const secret = (name: string): BackendSecret => {
  const secretProviderFactory = new BackendSecretFetcherProviderFactory();
  const secretResourceFactory = new BackendSecretFetcherFactory(
    secretProviderFactory
  );
  return new CfnTokenBackendSecret(name, secretResourceFactory);
};
