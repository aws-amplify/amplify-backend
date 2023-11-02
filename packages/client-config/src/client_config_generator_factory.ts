import { UnifiedClientConfigGenerator } from './unified_client_config_generator.js';
import { AuthClientConfigContributor } from './client-config-contributor/auth_client_config_contributor.js';
import { GraphqlClientConfigContributor } from './client-config-contributor/graphql_client_config_contributor.js';
import { ClientConfigGenerator } from './client_config_generator.js';
import { StorageClientConfigContributor } from './client-config-contributor/storage_client_config_contributor.js';
import { BackendOutput } from '@aws-amplify/plugin-types';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { ModelIntrospectionSchemaAdapter } from './client-config-contributor/model_introspection_schema_adapater.js';
import { PlatformClientConfigContributor } from './client-config-contributor/platform_client_config_contributor.js';

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
    credentialProvider: AwsCredentialIdentityProvider
  ): ClientConfigGenerator => {
    const modelSchemaAdapter = new ModelIntrospectionSchemaAdapter(
      credentialProvider
    );

    return new UnifiedClientConfigGenerator(this.fetchOutput, [
      new PlatformClientConfigContributor(),
      new AuthClientConfigContributor(),
      new GraphqlClientConfigContributor(modelSchemaAdapter),
      new StorageClientConfigContributor(),
    ]);
  };
}
