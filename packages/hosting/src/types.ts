import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { Bucket } from 'aws-cdk-lib/aws-s3';

/**
 * Configuration for defineHosting.
 */
export interface HostingProps {
  /**
   * Optional build command (e.g., 'npm run build').
   * Used by adapters to build the project before deploying.
   */
  buildCommand?: string;

  /**
   * Directory containing built output (e.g., 'dist', 'build').
   * Auto-detected from framework if not specified.
   */
  buildOutputDir?: string;

  /**
   * Framework type — auto-detected from package.json or set explicitly.
   */
  framework?: 'nextjs' | 'spa' | 'static';

  /**
   * Custom domain configuration (Phase 3 — types accepted now).
   */
  domain?: {
    domainName: string;
    hostedZone: string;
  };

  /**
   * WAF configuration (Phase 3 — types accepted now).
   */
  waf?: {
    enabled: boolean;
  };

  /**
   * Optional friendly name for the hosting resource.
   */
  name?: string;
}

/**
 * CDK resources created by the hosting construct.
 */
export interface HostingResources {
  /**
   * The S3 bucket storing hosting assets.
   */
  bucket: Bucket;

  /**
   * The CloudFront distribution serving the site.
   */
  distribution: Distribution;

  /**
   * The URL of the deployed site.
   */
  distributionUrl: string;
}
