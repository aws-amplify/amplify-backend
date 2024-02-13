import { Construct } from 'constructs';
import { Bucket, BucketProps, HttpMethods, IBucket } from 'aws-cdk-lib/aws-s3';
import {
  BackendOutputStorageStrategy,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import {
  StorageOutput,
  storageOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { Stack } from 'aws-cdk-lib';
import {
  AttributionMetadataStorage,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend-output-storage';
import { fileURLToPath } from 'url';

// Be very careful editing this value. It is the string that is used to attribute stacks to Amplify Storage in BI metrics
const storageStackType = 'storage-S3';

export type AmplifyStorageProps = {
  name: string;
  versioned?: boolean;
  outputStorageStrategy?: BackendOutputStorageStrategy<StorageOutput>;
};

export type StorageResources = {
  bucket: IBucket;
};

/**
 * Amplify Storage CDK Construct
 *
 * Currently just a thin wrapper around an S3 bucket
 */
export class AmplifyStorage
  extends Construct
  implements ResourceProvider<StorageResources>
{
  readonly resources: StorageResources;
  /**
   * Create a new AmplifyStorage instance
   */
  constructor(scope: Construct, id: string, props: AmplifyStorageProps) {
    super(scope, id);

    const bucketProps: BucketProps = {
      versioned: props.versioned || false,
      cors: [
        {
          maxAge: 3000,
          exposedHeaders: [
            'x-amz-server-side-encryption',
            'x-amz-request-id',
            'x-amz-id-2',
            'ETag',
          ],
          allowedHeaders: ['*'],
          allowedOrigins: ['*'],
          allowedMethods: [
            HttpMethods.GET,
            HttpMethods.HEAD,
            HttpMethods.PUT,
            HttpMethods.POST,
            HttpMethods.DELETE,
          ],
        },
      ],
    };

    this.resources = {
      bucket: new Bucket(this, 'Bucket', bucketProps),
    };

    this.storeOutput(props.outputStorageStrategy);

    new AttributionMetadataStorage().storeAttributionMetadata(
      Stack.of(this),
      storageStackType,
      fileURLToPath(new URL('../package.json', import.meta.url))
    );
  }

  /**
   * Store storage outputs using provided strategy
   */
  private storeOutput = (
    outputStorageStrategy: BackendOutputStorageStrategy<StorageOutput> = new StackMetadataBackendOutputStorageStrategy(
      Stack.of(this)
    )
  ): void => {
    outputStorageStrategy.addBackendOutputEntry(storageOutputKey, {
      version: '1',
      payload: {
        storageRegion: Stack.of(this).region,
        bucketName: this.resources.bucket.bucketName,
      },
    });
  };
}
