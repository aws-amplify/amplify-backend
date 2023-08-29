import { BackendOutputRetrievalStrategy } from '@aws-amplify/plugin-types';
import { unifiedBackendOutputSchema } from '@aws-amplify/backend-output-schemas';
import { ClientConfig } from './client-config-types/client_config.js';
import { ClientConfigContributor } from './client-config-contributor/client_config_contributor.js';
import { ClientConfigGenerator } from './client_config_generator.js';

/**
 * Right now this is mostly a stub. This will become a translation layer between backend output and frontend config
 *
 * There may be multiple implementations of this for different frontends
 */
export class UnifiedClientConfigGenerator implements ClientConfigGenerator {
  /**
   * Provide a reference to how this config generator should retrieve backend output
   */
  constructor(
    private readonly outputRetrievalStrategy: BackendOutputRetrievalStrategy,
    private readonly clientConfigContributors: ClientConfigContributor[]
  ) {}

  /**
   * Fetch all backend output, invoke each ClientConfigContributor on the result and merge into a single config object
   */
  generateClientConfig = async (): Promise<ClientConfig> => {
    const backendOutput = unifiedBackendOutputSchema.parse(
      await this.outputRetrievalStrategy.fetchBackendOutput()
    );

    return this.clientConfigContributors.reduce(
      (accumulator, configContributor) => ({
        ...accumulator,
        ...configContributor.contribute(backendOutput),
      }),
      {} as ClientConfig
    );
  };
}
