import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { StaticHosting } from './static-hosting.js';
import { AtomicDeployment, generateBuildId } from './atomic-deployment.js';
import { DeployManifest } from '../manifest/types.js';
import { HostingResources } from '../types.js';

export interface AmplifyHostingConstructProps {
  /**
   * The validated deploy manifest.
   */
  manifest: DeployManifest;

  /**
   * Absolute path to the .amplify-hosting/static/ directory.
   */
  staticAssetPath: string;

  /**
   * Optional friendly name.
   */
  name?: string;
}

/**
 * Top-level L3 construct that orchestrates hosting infrastructure.
 *
 * For Phase 1 (SPA/static): creates StaticHosting + AtomicDeployment.
 * In future phases, compute routes will create Lambda functions.
 */
export class AmplifyHostingConstruct extends Construct {
  readonly bucket: Bucket;
  readonly distribution: Distribution;
  readonly distributionUrl: string;

  constructor(
    scope: Construct,
    id: string,
    props: AmplifyHostingConstructProps,
  ) {
    super(scope, id);

    // Generate build ID from manifest or timestamp
    const buildId = props.manifest.buildId ?? generateBuildId();

    // Create S3 + CloudFront + OAC + CF Function
    const staticHosting = new StaticHosting(this, 'StaticHosting', {
      buildId,
      name: props.name,
    });

    this.bucket = staticHosting.bucket;
    this.distribution = staticHosting.distribution;
    this.distributionUrl = `https://${this.distribution.distributionDomainName}`;

    // Deploy static assets with Build ID prefix
    new AtomicDeployment(this, 'AtomicDeployment', {
      bucket: this.bucket,
      buildId,
      assetPath: props.staticAssetPath,
    });

    // Output the distribution URL
    new CfnOutput(this, 'DistributionUrl', {
      value: this.distributionUrl,
      description: 'CloudFront distribution URL for the hosted site',
    });
  }

  /**
   * Get the hosting resources for output wiring.
   */
  getResources(): HostingResources {
    return {
      bucket: this.bucket,
      distribution: this.distribution,
      distributionUrl: this.distributionUrl,
    };
  }
}
