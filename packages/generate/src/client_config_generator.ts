import { OutputRetrievalStrategy } from './output_retrieval_strategy.js';
import { AmplifyBackendOutput } from './amplify_backend_output.js';

export type ClientConfigGenerator = {
  generateClientConfig(): Promise<ClientConfig>;
};

// TODO ClientConfig will be a translation of AmplifyBackendOutput into a frontend-specific format
export type ClientConfig = AmplifyBackendOutput;

/**
 * Right now this is mostly a stub. This will become a translation layer between backend output and frontend config
 *
 * There may be multiple implementations of this for different frontends
 */
export class DefaultClientConfigGenerator implements ClientConfigGenerator {
  /**
   * Provide a reference to how this config generator should retrieve backend output
   */
  constructor(
    private readonly outputRetrievalStrategy: OutputRetrievalStrategy
  ) {}

  /**
   * TODO right now this is just a pass through. But there will be translation logic here
   */
  async generateClientConfig(): Promise<ClientConfig> {
    return await this.outputRetrievalStrategy.fetchAllOutputs();
  }
}
