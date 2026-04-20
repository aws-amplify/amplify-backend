import { Duration } from 'aws-cdk-lib';
import { Distribution, PriceClass } from 'aws-cdk-lib/aws-cloudfront';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { FrameworkAdapterFn } from './adapters/index.js';

/**
 * Open union type for framework names.
 * Provides autocomplete for built-in frameworks while accepting any string.
 */
export type FrameworkType = 'nextjs' | 'spa' | 'static' | (string & {});

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
   * Custom framework adapter for unsupported frameworks.
   * When provided, this adapter is used instead of the built-in registry lookup.
   */
  customAdapter?: FrameworkAdapterFn;

  /**
   * Custom domain configuration.
   */
  domain?: {
    domainName: string;
    hostedZone: string;
    /** BYO ACM certificate (must be in us-east-1 for CloudFront). */
    certificate?: ICertificate;
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
   * Compute (Lambda) configuration for SSR frameworks.
   * Ignored for SPA and static site deployments.
   */
  compute?: {
    /** Lambda memory size in MB. Default: 512 */
    memorySize?: number;
    /** Lambda timeout. Default: 30 seconds. */
    timeout?: Duration;
    /** Reserved concurrent executions. Default: undefined (no reservation). */
    reservedConcurrency?: number;
    /** CloudWatch log retention for the SSR Lambda. Default: TWO_WEEKS. */
    logRetention?: RetentionDays;
  };

  /**
   * CDN (CloudFront) configuration.
   */
  cdn?: {
    /** CloudFront price class. Default: PRICE_CLASS_100 (US, Canada, Europe). */
    priceClass?: PriceClass;
    /** Custom Content-Security-Policy header value. If not set, a restrictive default is used. */
    contentSecurityPolicy?: string;
    /** Geo-restriction configuration for CloudFront distribution. */
    geoRestriction?: {
      type: 'whitelist' | 'blacklist';
      countries: string[];
    };
  };

  /**
   * S3 storage configuration.
   */
  storage?: {
    /** Encryption type for the hosting bucket. Default: S3_MANAGED. */
    encryption?: 'S3_MANAGED' | 'KMS';
    /** BYO KMS key for bucket encryption (requires encryption: 'KMS'). */
    encryptionKey?: IKey;
    /** If true, the S3 bucket is retained on stack deletion. Default: false. */
    retainOnDelete?: boolean;
    /** Days to retain build artifacts in S3. Default: 365. */
    buildRetentionDays?: number;
  };

  /**
   * CloudFront access logging configuration.
   */
  logging?: {
    /** Enable CloudFront access logging to a dedicated S3 bucket. */
    enabled: boolean;
    /** Days to retain access logs. Default: 90. */
    retentionDays?: number;
  };
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
