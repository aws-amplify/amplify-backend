import { unifiedBackendOutputSchema } from '@aws-amplify/backend-output-schemas';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { BackendOutputFetcherFactory } from './backend_output_fetcher_factory.js';
import { BackendIdentifier } from './index.js';

/**
 * Simplifies the retrieval of all backend output values
 */
export const getUnifiedBackendOutput = async (
  credentials: AwsCredentialIdentityProvider,
  backendIdentifier: BackendIdentifier
) => {
  const outputFetcher = new BackendOutputFetcherFactory(
    new CloudFormationClient({ credentials }),
    new AmplifyClient({ credentials })
  ).getStrategy(backendIdentifier);
  const output = await outputFetcher.fetchBackendOutput();
  return unifiedBackendOutputSchema.parse(output);
};
