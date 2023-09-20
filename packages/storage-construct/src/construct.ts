import { Construct } from 'constructs';
import { Bucket, BucketProps } from 'aws-cdk-lib/aws-s3';
import {
  BackendOutputStorageStrategy,
  BackendOutputWriter,
} from '@aws-amplify/plugin-types';
import { storageOutputKey } from '@aws-amplify/backend-output-schemas';
import { StorageOutput } from '@aws-amplify/backend-output-schemas/storage';
import { Stack } from 'aws-cdk-lib';

export type AmplifyStorageProps = {
  versioned?: boolean;
};

/**
 * Amplify Storage CDK Construct
 *
 * Currently just a thin wrapper around an S3 bucket
 */
export class AmplifyStorage extends Construct implements BackendOutputWriter {
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
  }

  /**
   * Store storage outputs using provided strategy
   */
  storeOutput = (
    outputStorageStrategy: BackendOutputStorageStrategy<StorageOutput>
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
