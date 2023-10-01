import { unifiedBackendOutputSchema } from '@aws-amplify/backend-output-schemas';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { BackendOutputFetcherFactory } from './backend_output_fetcher_factory.js';
import { BackendIdentifier } from './index.js';
import { BackendOutputClient } from './backend_output_client_factory.js';

/**
 * Simplifies the retrieval of all backend output values
 */
export class DefaultBackendOutputClient implements BackendOutputClient {
  /**
   * Instantiates a BackendOutputClient
   */
  constructor(private credentials: AwsCredentialIdentityProvider) {}
  getOutput = async (backendIdentifier: BackendIdentifier) => {
    const outputFetcher = new BackendOutputFetcherFactory(
      new CloudFormationClient({ credentials: this.credentials }),
      new AmplifyClient({ credentials: this.credentials })
    ).getStrategy(backendIdentifier);
    const output = await outputFetcher.fetchBackendOutput();
    return unifiedBackendOutputSchema.parse(output);
  };
}
