import { Construct } from 'constructs';
import { BackendSecretFetcherProviderFactory } from './backend_secret_fetcher_provider_factory.js';
import { CustomResource, CustomResourceProps, Lazy } from 'aws-cdk-lib';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { SecretResourceProps } from './lambda/backend_secret_fetcher_types.js';

/**
 * Resource provider ID for the backend secret resource.
 */
export const SECRET_RESOURCE_PROVIDER_ID = 'SecretFetcherResourceProvider';

class SecretFetcherCustomResource extends CustomResource {
  private secrets: Set<string>;
  constructor(
    scope: Construct,
    id: string,
    props: CustomResourceProps,
    secrets: Set<string>
  ) {
    super(scope, id, {
      ...props,
    });
    this.secrets = secrets;
  }

  public addSecret = (secretName: string) => {
    this.secrets.add(secretName);
  };
}

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
    private secretProviderFactory: BackendSecretFetcherProviderFactory
  ) {}

  /**
   * Returns a resource if it exists in the input scope. Otherwise,
   * creates a new one.
   */
  getOrCreate = (
    scope: Construct,
    secretName: string,
    backendIdentifier: BackendIdentifier
  ): SecretFetcherCustomResource => {
    const secretResourceId = `SecretFetcherResource`;
    const existingResource = scope.node.tryFindChild(
      secretResourceId
    ) as SecretFetcherCustomResource;

    if (existingResource) {
      existingResource.addSecret(secretName);
      return existingResource;
    }
    const secrets: Set<string> = new Set();
    secrets.add(secretName);

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
      type: backendIdentifier.type,
      secretNames: Lazy.list({
        produce: () => {
          return Array.from(secrets);
        },
      }),
    };

    return new SecretFetcherCustomResource(
      scope,
      secretResourceId,
      {
        serviceToken: provider.serviceToken,
        properties: {
          ...customResourceProps,
          secretLastUpdated, // this property is only to trigger resource update event.
        },
        resourceType: SECRET_RESOURCE_TYPE,
      },
      secrets
    );
  };
}
