import { Construct } from 'constructs';
import { BackendSecretFetcherProviderFactory } from './backend_secret_fetcher_provider_factory.js';
import { CustomResource } from 'aws-cdk-lib';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { randomUUID } from 'node:crypto';

/**
 * Resource provider ID for the backend secret resource.
 */
export const SECRET_RESOURCE_PROVIDER_ID = 'SecretFetcherResourceProvider';

/**
 * Type of the backend custom CFN resource.
 */
const SECRET_RESOURCE_TYPE = `Custom::SecretFetcherResource`;

/**
 * The factory to create backend secret-fetcher resource.
 */
export class BackendSecretFetcherFactory {
  /**
   * Creates a backend secret-fetcher resource factory.
   */
  constructor(
    private readonly secretProviderFactory: BackendSecretFetcherProviderFactory
  ) {}

  /**
   * Returns a resource if it exists in the input scope. Otherwise,
   * creates a new one.
   */
  getOrCreate = (
    scope: Construct,
    secretName: string,
    backendIdentifier: UniqueBackendIdentifier
  ): CustomResource => {
    const secretResourceId = `${secretName}SecretFetcherResource`;
    const existingResource = scope.node.tryFindChild(
      secretResourceId
    ) as CustomResource;

    if (existingResource) {
      return existingResource;
    }

    const provider = this.secretProviderFactory.getOrCreateInstance(
      scope,
      SECRET_RESOURCE_PROVIDER_ID,
      backendIdentifier
    );

    // In sandbox environment, we don't want to update secret resources in every deployment.
    // It will disable the hotswap capability. The solution here is to use the sandbox start-up
    // time as a no-op parameter. Secrets will only be loaded when `amplify sandbox` is executed.
    // Subsequent deployments triggered by the sandbox watcher will not update secret resources.
    const sandboxStartUpTime = scope.node.tryGetContext('sandboxStartUpTime');

    return new CustomResource(scope, secretResourceId, {
      serviceToken: provider.serviceToken,
      properties: {
        backendId: backendIdentifier.backendId,
        branchName: backendIdentifier.disambiguator,
        secretName: secretName,
        noop: sandboxStartUpTime ?? randomUUID(),
      },
      resourceType: SECRET_RESOURCE_TYPE,
    });
  };
}
