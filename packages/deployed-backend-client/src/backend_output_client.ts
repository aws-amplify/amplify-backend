import { unifiedBackendOutputSchema } from '@aws-amplify/backend-output-schemas';
import { type AmplifyClient } from '@aws-sdk/client-amplify';
import { type CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { BackendOutputFetcherFactory } from './backend_output_fetcher_factory.js';
import { type DeployedBackendIdentifier } from './index.js';
import { type BackendOutputClient } from './backend_output_client_factory.js';

/**
 * Simplifies the retrieval of all backend output values
 */
export class DefaultBackendOutputClient implements BackendOutputClient {
  /**
   * Instantiates a BackendOutputClient
   */
  constructor(
    private cloudFormationClient: CloudFormationClient,
    private amplifyClient: AmplifyClient
  ) {}
  getOutput = async (backendIdentifier: DeployedBackendIdentifier) => {
    const outputFetcher = new BackendOutputFetcherFactory(
      this.cloudFormationClient,
      this.amplifyClient
    ).getStrategy(backendIdentifier);
    const output = await outputFetcher.fetchBackendOutput();
    return unifiedBackendOutputSchema.parse(output);
  };
}
