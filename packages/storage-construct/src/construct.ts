import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';

export type StorageProps = Record<string, never>;

/**
 * Amplify Storage CDK Construct
 *
 * Currently just a thin wrapper around an S3 bucket
 */
export class AmplifyStorage extends Construct {
  /**
   * Create a new AmplifyStorage instance
   */
  constructor(scope: Construct, id: string, props: StorageProps = {}) {
    super(scope, id);

    new Bucket(scope, `${id}Bucket`);
  }
}
