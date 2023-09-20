import { UnifiedClientConfigGenerator } from './unified_client_config_generator.js';
import { AuthClientConfigContributor } from './client-config-contributor/auth_client_config_contributor.js';
import { GraphqlClientConfigContributor } from './client-config-contributor/graphql_client_config_contributor.js';
import { ClientConfigGenerator } from './client_config_generator.js';
import { StorageClientConfigContributor } from './client-config-contributor/storage_client_config_contributor.js';
import { BackendIdentifier } from './generate_client_config.js';
import { BackendOutputRetrievalStrategyFactory } from './backend_output_retrieval_strategy_factory.js';

/**
 * Creates ClientConfigGenerators given different backend identifiers
 */
export class ClientConfigGeneratorFactory {
  private readonly clientConfigContributors = [
    new AuthClientConfigContributor(),
    new GraphqlClientConfigContributor(),
    new StorageClientConfigContributor(),
  ];
  /**
   * Provide the factory with AWS credentials. These credentials will be used to configure underlying SDK clients for resolving backend output.
   */
  constructor(
    private outputRetrievalStrategyFactory: BackendOutputRetrievalStrategyFactory
  ) {}

  /**
   * Returns a ClientConfigGenerator for the given BackendIdentifier type
   */
  getInstance = (
    backendIdentifier: BackendIdentifier
  ): ClientConfigGenerator => {
    return new UnifiedClientConfigGenerator(
      this.outputRetrievalStrategyFactory.getStrategy(backendIdentifier),
      this.clientConfigContributors
    );
  };
}
