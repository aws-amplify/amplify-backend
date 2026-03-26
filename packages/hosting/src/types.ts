import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { FrameworkAdapterFn } from './adapters/index.js';

/**
 * Open union type for framework names.
 * Provides autocomplete for built-in frameworks while accepting any string.
 */
export type FrameworkType = 'nextjs' | 'spa' | 'static' | (string & {});

/**
 * Compute (Lambda) configuration for SSR frameworks.
 * Ignored for SPA and static site deployments.
 */
export type ComputeConfig = {
  /** Lambda memory size in MB. Default: 512 */
  memorySize?: number;
  /** Lambda timeout in seconds. Default: 30 */
  timeout?: number;
  /** Reserved concurrent executions. Default: undefined (no reservation). */
  reservedConcurrency?: number;
};

/**
 * Configuration for defineHosting.
 */
export type HostingProps = {
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
   * Accepts built-in values ('nextjs', 'spa', 'static') or any custom string.
   */
  framework?: FrameworkType;

  /**
   * Custom domain configuration.
   */
  domain?: {
    domainName: string;
    hostedZone: string;
  };

  /**
   * WAF configuration.
   */
  waf?: {
    enabled: boolean;
    /** Requests per 5-minute window per IP. Default: 1000 */
    rateLimit?: number;
  };

  /**
   * Custom framework adapter for unsupported frameworks.
   * When provided, this adapter is used instead of the built-in registry lookup.
   */
  customAdapter?: FrameworkAdapterFn;

  /**
   * Lambda compute configuration for SSR frameworks (e.g., Next.js).
   * Ignored for SPA and static site deployments.
   */
  compute?: ComputeConfig;

  /**
   * If true, the S3 bucket is retained on stack deletion instead of being destroyed.
   * Default: false (bucket is destroyed with all objects on stack delete).
   */
  retainOnDelete?: boolean;

  /**
   * Enable CloudFront access logging to an S3 bucket.
   * Default: false. Adds a dedicated log bucket when enabled.
   */
  accessLogging?: boolean;

  /**
   * Custom Content-Security-Policy header value.
   * If not set, a restrictive default is used.
   */
  contentSecurityPolicy?: string;

  /**
   * Optional friendly name for the hosting resource.
   */
  name?: string;
};

/**
 * CDK resources created by the hosting construct.
 */
export type HostingResources = {
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
};
