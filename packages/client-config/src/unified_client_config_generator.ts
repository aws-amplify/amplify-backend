import { BackendOutput } from '@aws-amplify/plugin-types';
import { unifiedBackendOutputSchema } from '@aws-amplify/backend-output-schemas';
import { ClientConfig } from './client-config-types/client_config.js';
import { ClientConfigContributor } from './client-config-contributor/client_config_contributor.js';
import { ClientConfigGenerator } from './client_config_generator.js';
import {
  AmplifyUserError,
  ObjectAccumulator,
  ObjectAccumulatorPropertyAlreadyExistsError,
} from '@aws-amplify/platform-core';

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
    private readonly fetchOutput: () => Promise<BackendOutput>,
    private readonly clientConfigContributors: ClientConfigContributor[]
  ) {}

  /**
   * Fetch all backend output, invoke each ClientConfigContributor on the result and merge into a single config object
   */
  generateClientConfig = async (): Promise<ClientConfig> => {
    const backendOutput = unifiedBackendOutputSchema.parse(
      await this.fetchOutput()
    );

    const accumulator = new ObjectAccumulator<ClientConfig>({});
    for (const contributor of this.clientConfigContributors) {
      const clientConfigContribution = await contributor.contribute(
        backendOutput
      );
      try {
        accumulator.accumulate(clientConfigContribution);
      } catch (error) {
        if (error instanceof ObjectAccumulatorPropertyAlreadyExistsError) {
          throw new AmplifyUserError(
            'OutputEntryAlreadyExistsError',
            {
              message: `Duplicated entry with key ${error.key} detected in deployment outputs`,
              resolution:
                "Check if 'backend.addOutput' is called multiple times with overlapping inputs or" +
                " if 'backend.addOutput' is called with values overlapping Amplify managed keys",
            },
            error
          );
        }
        throw error;
      }
    }
    return accumulator.getAccumulatedObject();
  };
}
