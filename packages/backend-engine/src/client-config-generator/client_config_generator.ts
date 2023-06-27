import { BackendOutputRetrievalStrategy } from '@aws-amplify/plugin-types';
import { backendOutputSchema } from '@aws-amplify/backend-output-schemas';
import { ClientConfig } from './client_config.js';
import { ClientConfigContributor } from './client-config-contributor/client_config_contributor.js';

export type ClientConfigGenerator = {
  generateClientConfig(): Promise<ClientConfig>;
};

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
   * Fetch all backend output, map output entries to transformers and return the unified transformed result
   * TODO need to do transformation here
   */
  async generateClientConfig(): Promise<ClientConfig> {
    const backendOutput = backendOutputSchema.parse(
      await this.outputRetrievalStrategy.fetchBackendOutput()
    );

    return this.clientConfigContributors.reduce(
      (accumulator, configContributor) => ({
        ...accumulator,
        ...configContributor.contribute(backendOutput),
      }),
      {} as ClientConfig
    );
  }
}
