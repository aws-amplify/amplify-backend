import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';

export interface AtomicDeploymentProps {
  /**
   * The S3 bucket to deploy assets to.
   */
  bucket: Bucket;

  /**
   * Build ID used as prefix for the S3 keys.
   */
  buildId: string;

  /**
   * Absolute path to the static assets directory (.amplify-hosting/static/).
   */
  assetPath: string;
}

/**
 * Handles atomic deployment of static assets using a Build ID prefix.
 *
 * Assets are uploaded to `builds/{buildId}/` in the S3 bucket.
 * Combined with the CloudFront Function (in StaticHosting), requests
 * are rewritten to include the build ID prefix, enabling zero-downtime deploys.
 */
export class AtomicDeployment extends Construct {
  readonly deployment: BucketDeployment;
  readonly buildId: string;

  constructor(scope: Construct, id: string, props: AtomicDeploymentProps) {
    super(scope, id);

    this.buildId = props.buildId;

    // Deploy assets to S3 under the builds/{buildId}/ prefix
    this.deployment = new BucketDeployment(this, 'AssetDeployment', {
      sources: [Source.asset(props.assetPath)],
      destinationBucket: props.bucket,
      destinationKeyPrefix: `builds/${props.buildId}/`,
      // Keep previous builds for rollback capability
      prune: false,
    });
  }
}

/**
 * Generate a unique Build ID based on the current timestamp.
 */
export const generateBuildId = (): string => {
  return Date.now().toString(36);
};
