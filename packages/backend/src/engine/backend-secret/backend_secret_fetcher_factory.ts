import { Construct } from 'constructs';
import { BackendSecretFetcherProviderFactory } from './backend_secret_fetcher_provider_factory.js';
import { CustomResource } from 'aws-cdk-lib';
import {
  BranchBackendIdentifier,
  SandboxBackendIdentifier,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';

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
    secretVersion: number,
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

    const branchName: string =
      (backendIdentifier as BranchBackendIdentifier).branchName ??
      (backendIdentifier as SandboxBackendIdentifier).sandbox;
    return new CustomResource(scope, secretResourceId, {
      serviceToken: provider.serviceToken,
      properties: {
        backendId: backendIdentifier.backendId,
        branchName,
        secretName: secretName,
        secretVersion: secretVersion,
      },
      resourceType: SECRET_RESOURCE_TYPE,
    });
  };
}
