import { UnifiedClientConfigGenerator } from './unified_client_config_generator.js';
import { AuthClientConfigContributor } from './gen1-client-config-contributor/auth_client_config_contributor.js';
import { GraphqlClientConfigContributor } from './gen1-client-config-contributor/graphql_client_config_contributor.js';
import { ClientConfigGenerator } from './client_config_generator.js';
import { StorageClientConfigContributor } from './gen1-client-config-contributor/storage_client_config_contributor.js';
import { BackendOutput } from '@aws-amplify/plugin-types';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { ModelIntrospectionSchemaAdapter } from './model_introspection_schema_adapter.js';
import { PlatformClientConfigContributor } from './gen1-client-config-contributor/platform_client_config_contributor.js';
import { CustomClientConfigContributor } from './gen1-client-config-contributor/custom_client_config_contributor.js';
import { ClientConfigContributorFactory } from './gen2-client-config-contributor/client_config_contributor_factory.js';

/**
 * Creates ClientConfigGenerators given different backend identifiers
 */
export class ClientConfigGeneratorFactory {
  /**
   * Provide the factory with AWS credentials. These credentials will be used to configure underlying SDK clients for resolving backend output.
   */
  constructor(private readonly fetchOutput: () => Promise<BackendOutput>) {}

  /**
   * Returns a ClientConfigGenerator for the given BackendIdentifier type
   */
  getInstance = (
    credentialProvider: AwsCredentialIdentityProvider,
    version?: number
  ): ClientConfigGenerator => {
    const modelSchemaAdapter = new ModelIntrospectionSchemaAdapter(
      credentialProvider
    );

    if (version && version >= 1) {
      return new UnifiedClientConfigGenerator(
        this.fetchOutput,
        new ClientConfigContributorFactory(modelSchemaAdapter).getContributors(
          version
        )
      );
    }

    return new UnifiedClientConfigGenerator(this.fetchOutput, [
      new PlatformClientConfigContributor(),
      new AuthClientConfigContributor(),
      new GraphqlClientConfigContributor(modelSchemaAdapter),
      new StorageClientConfigContributor(),
      // Custom client config contributor must be last in the pipeline
      // as it has capability of overriding previously defined properties.
      new CustomClientConfigContributor(),
    ]);
  };
}
