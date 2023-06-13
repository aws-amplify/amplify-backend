import { Construct } from 'constructs';
import { Bucket, BucketProps } from 'aws-cdk-lib/aws-s3';
import {
  AmplifyOutputWriter,
  OutputStorageStrategy,
} from '@aws-amplify/backend-types';
import packageJson from '#package.json';

export type AmplifyStorageProps = {
  versioned?: boolean;
};

/**
 * Amplify Storage CDK Construct
 *
 * Currently just a thin wrapper around an S3 bucket
 */
export class AmplifyStorage extends Construct implements AmplifyOutputWriter {
  private readonly bucket: Bucket;
  /**
   * Create a new AmplifyStorage instance
   */
  constructor(scope: Construct, id: string, props: AmplifyStorageProps) {
    super(scope, id);

    const bucketProps: BucketProps = {
      versioned: props.versioned || false,
    };

    this.bucket = new Bucket(scope, `${id}Bucket`, bucketProps);
  }

  /**
   * Store storage outputs using provided strategy
   */
  storeOutput(outputStorageStrategy: OutputStorageStrategy): void {
    outputStorageStrategy.storeOutput(packageJson.name, packageJson.version, {
      bucketName: this.bucket.bucketName,
    });
  }
}
