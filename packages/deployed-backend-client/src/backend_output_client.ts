import { unifiedBackendOutputSchema } from '@aws-amplify/backend-output-schemas';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { BackendOutputFetcherFactory } from './backend_output_fetcher_factory.js';
import { DeployedBackendIdentifier } from './index.js';
import { BackendOutputClient } from './backend_output_client_factory.js';

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

    if (
      output['AWS::Amplify::Storage'] &&
      Object.keys(output['AWS::Amplify::Storage'].payload).length >= 4
    ) {
      const payload = output['AWS::Amplify::Storage'].payload;
      const buckets: {
        bucketName: string;
        storageRegion: string;
      }[] = [];
      const bucketNames = Object.keys(payload).filter((key) =>
        key.startsWith('bucketName')
      );
      const hasDefaultBucket = bucketNames.includes('bucketName');
      if (!hasDefaultBucket) {
        throw new AmplifyUserError('NoDefaultBucketError', {
          message: 'No default bucket set in the Amplify project.',
          resolution:
            'Add `isDefault: true` to one of the buckets `defineStorage` in the Amplify project.',
        });
      }
      bucketNames.forEach((key) => {
        if (!key.startsWith('bucketName')) {
          return;
        }
        const postfix = key.replace('bucketName', '');
        const bucketName = payload[`bucketName${postfix}`];
        const storageRegion = payload[`storageRegion${postfix}`];
        buckets.push({ bucketName, storageRegion });
        if (postfix) {
          delete payload[bucketName];
          delete payload[storageRegion];
        }
      });

      return unifiedBackendOutputSchema.parse({
        ...output,
        'AWS::Amplify::Storage': {
          ...output['AWS::Amplify::Storage'],
          payload: { ...payload, buckets },
        },
      });
    }

    return unifiedBackendOutputSchema.parse(output);
  };
}
