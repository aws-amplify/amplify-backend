import { Construct } from 'constructs';
import { BackendSecretResourceProviderFactory } from './backend_secret_resource_provider_factory.js';
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
export const SECRET_RESOURCE_TYPE = `Custom::SecretFetcherResource`;

/**
 * The factory to create backend secret resource.
 */
export class BackendSecretResourceFactory {
  /**
   * Creates a backend secret resource factory.
   */
  constructor(
    private readonly secretProviderFactory: BackendSecretResourceProviderFactory
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

    return new CustomResource(scope, secretResourceId, {
      serviceToken: provider.serviceToken,
      properties: {
        backendId: backendIdentifier.backendId,
        branchName: backendIdentifier.branchName,
        secretName: secretName,
        noop: randomUUID(), // just so it can be triggered on every deployment.
      },
      resourceType: SECRET_RESOURCE_TYPE,
    });
  };
}
