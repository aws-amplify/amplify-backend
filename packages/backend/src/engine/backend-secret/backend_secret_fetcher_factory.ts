import { Construct } from 'constructs';
import { BackendSecretFetcherProviderFactory } from './backend_secret_fetcher_provider_factory.js';
import { CustomResource } from 'aws-cdk-lib';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { SecretResourceProps } from './lambda/backend_secret_fetcher_types.js';

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
    backendIdentifier: BackendIdentifier
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

    // Sandbox deployment passes down the secret's last updated timestamp to
    // trigger secret update. It is to optimize sandbox deployment time by
    // leveraging cdk hotswap.
    const secretLastUpdated =
      scope.node.tryGetContext('secretLastUpdated') ?? Date.now();

    const customResourceProps: SecretResourceProps = {
      namespace: backendIdentifier.namespace,
      name: backendIdentifier.name,
      secretName: secretName,
    };

    return new CustomResource(scope, secretResourceId, {
      serviceToken: provider.serviceToken,
      properties: {
        ...customResourceProps,
        secretLastUpdated, // this property is only to trigger resource update event.
      },
      resourceType: SECRET_RESOURCE_TYPE,
    });
  };
}
