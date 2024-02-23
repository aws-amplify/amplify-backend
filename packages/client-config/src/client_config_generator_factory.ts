import { UnifiedClientConfigGenerator } from './unified_client_config_generator.js';
import { AuthClientConfigContributor } from './client-config-contributor-legacy/auth_client_config_contributor.js';
import { GraphqlClientConfigContributor } from './client-config-contributor-legacy/graphql_client_config_contributor.js';
import { ClientConfigGenerator } from './client_config_generator.js';
import { StorageClientConfigContributor } from './client-config-contributor-legacy/storage_client_config_contributor.js';
import { BackendOutput } from '@aws-amplify/plugin-types';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { ModelIntrospectionSchemaAdapter } from './model_introspection_schema_adapter.js';
import { PlatformClientConfigContributor } from './client-config-contributor-legacy/platform_client_config_contributor.js';
import { CustomClientConfigContributor } from './client-config-contributor-legacy/custom_client_config_contributor.js';
import { ClientConfigContributorFactory } from './client-config-contributor-gen2/client_config_contributor_factory.js';
import { ClientConfigVersion } from './index.js';

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
    version?: ClientConfigVersion
  ): ClientConfigGenerator => {
    const modelSchemaAdapter = new ModelIntrospectionSchemaAdapter(
      credentialProvider
    );

    if (version && version != '0') {
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
