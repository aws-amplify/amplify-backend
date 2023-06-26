import {
  BackendOutputEntry,
  BackendOutputRetrievalStrategy,
} from '@aws-amplify/plugin-types';

export type ClientConfigGenerator = {
  generateClientConfig(): Promise<ClientConfig>;
};

// TODO ClientConfig will be a translation of BackendOutput into a frontend-specific format
// https://github.com/aws-amplify/samsara-cli/issues/48
export type ClientConfig = BackendOutputEntry[];

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
    private readonly outputRetrievalStrategy: BackendOutputRetrievalStrategy
  ) {}

  /**
   * TODO right now this is just a pass through. But there will be translation logic here
   * https://github.com/aws-amplify/samsara-cli/issues/48
   */
  async generateClientConfig(): Promise<ClientConfig> {
    return await this.outputRetrievalStrategy.fetchBackendOutput();
  }
}
