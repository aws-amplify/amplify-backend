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

    // In sandbox environment, the context contains the secret updated timestamp. It is
    // to avoid unnecessary secret resource update which blocks sandbox hot-swapping.
    let lastUpdated = scope.node.tryGetContext(secretName);
    if (!lastUpdated) {
      // Either a secret is not defined or it is a pipeline deployment. We pass in a random uuid
      // to trigger the resource update. If it is an undefined-secret case, the deployment will fail.
      lastUpdated = randomUUID();
    }

    return new CustomResource(scope, secretResourceId, {
      serviceToken: provider.serviceToken,
      properties: {
        backendId: backendIdentifier.backendId,
        branchName: backendIdentifier.disambiguator,
        secretName: secretName,
        lastUpdated: lastUpdated,
      },
      resourceType: SECRET_RESOURCE_TYPE,
    });
  };
}
