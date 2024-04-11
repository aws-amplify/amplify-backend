import { UnifiedClientConfigGenerator } from './unified_client_config_generator.js';
import { ClientConfigGenerator } from './client_config_generator.js';
import { BackendOutput } from '@aws-amplify/plugin-types';
import { ModelIntrospectionSchemaAdapter } from './model_introspection_schema_adapter.js';
import { ClientConfigContributorFactory } from './client-config-contributor/client_config_contributor_factory.js';
import {
  ClientConfigGeneratorFactoryOptions,
  ClientConfigVersion,
} from './index.js';

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
    options: ClientConfigGeneratorFactoryOptions,
    version: ClientConfigVersion
  ): ClientConfigGenerator => {
    const modelSchemaAdapter = new ModelIntrospectionSchemaAdapter(options);

    return new UnifiedClientConfigGenerator(
      this.fetchOutput,
      new ClientConfigContributorFactory(modelSchemaAdapter).getContributors(
        version
      )
    );
  };
}
