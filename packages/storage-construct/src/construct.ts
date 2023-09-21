import { Construct } from 'constructs';
import { Bucket, BucketProps } from 'aws-cdk-lib/aws-s3';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { storageOutputKey } from '@aws-amplify/backend-output-schemas';
import { StorageOutput } from '@aws-amplify/backend-output-schemas/storage';
import { Stack } from 'aws-cdk-lib';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';

export type AmplifyStorageProps = {
  versioned?: boolean;
  outputStorageStrategy?: BackendOutputStorageStrategy<StorageOutput>;
};

/**
 * Amplify Storage CDK Construct
 *
 * Currently just a thin wrapper around an S3 bucket
 */
export class AmplifyStorage extends Construct {
  private readonly bucket: Bucket;
  /**
   * Create a new AmplifyStorage instance
   */
  constructor(scope: Construct, id: string, props: AmplifyStorageProps) {
    super(scope, id);

    const bucketProps: BucketProps = {
      versioned: props.versioned || false,
    };

    this.bucket = new Bucket(this, `${id}Bucket`, bucketProps);

    this.storeOutput(props.outputStorageStrategy);
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
        bucketName: this.bucket.bucketName,
      },
    });
  };
}
