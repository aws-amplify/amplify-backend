import { Duration } from 'aws-cdk-lib';
import { Distribution, PriceClass } from 'aws-cdk-lib/aws-cloudfront';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { FrameworkAdapterFn } from './adapters/index.js';

/**
 * Open union type for framework names.
 * Provides autocomplete for built-in frameworks while accepting any string.
 */
export type FrameworkType =
  | 'nextjs'
  | 'nitro'
  | 'nuxt'
  | 'astro'
  | 'spa'
  | 'static'
  | (string & {});

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
   * Framework type — auto-detected from package.json or set explicitly.
   * Accepts built-in values ('nextjs', 'spa', 'static') or any custom string.
   */
  framework?: FrameworkType;

  /**
   * Explicit path (relative to project root) where pre-built output lives.
   * When set, the SPA/static adapter uses this directory directly instead of
   * auto-detecting (dist/, build/, out/).
   * For Next.js, this is not used — OpenNext always runs its own build.
   */
  buildOutputDir?: string;

  /**
   * Custom framework adapter for unsupported frameworks.
   * When provided, this adapter is used instead of the built-in registry lookup.
   * Receives the project directory and returns a DeployManifest.
   */
  customAdapter?: FrameworkAdapterFn;

  /**
   * Custom domain configuration.
   *
   * When `hostedZone` (or `hostedZoneId`) is provided, Route 53 A/AAAA records
   * are created automatically. When omitted (BYO domain), the user manages DNS
   * externally - the distribution domain name is output for CNAME configuration.
   * @example
   * ```typescript
   * // Single domain
   * domain: { domainName: 'example.com', hostedZone: 'example.com' }
   *
   * // Multiple domains with www redirect
   * domain: {
   *   domainName: ['example.com', 'www.example.com'],
   *   hostedZone: 'example.com',
   *   wwwRedirect: 'toApex',
   * }
   *
   * // BYO domain - user manages DNS externally
   * domain: {
   *   domainName: ['example.com'],
   *   certificate: myCert,
   * }
   * ```
   */
  domain?: {
    /** Domain name(s) for the hosting distribution. Accepts a single domain or an array for multi-domain setups. */
    domainName: string | string[];
    /**
     * Route 53 hosted zone domain name (e.g. 'example.com').
     * When omitted, DNS records are not created — the user must configure
     * their external DNS to CNAME to the CloudFront distribution domain.
     */
    hostedZone?: string;
    /**
     * Route 53 hosted zone ID. When provided, avoids `HostedZone.fromLookup()`
     * (which requires `env: { account, region }` on the stack). Useful in
     * pipeline stages where account/region aren't known at synth time.
     */
    hostedZoneId?: string;
    /** BYO ACM certificate (must be in us-east-1 for CloudFront). */
    certificate?: ICertificate;
    /**
     * Redirect www to apex (or vice versa) via a CloudFront Function.
     * Only effective when both apex and www are included in domain names.
     * @default 'none'
     */
    wwwRedirect?: 'toApex' | 'toWww' | 'none';
  };

  /**
   * WAF configuration.
   */
  waf?: {
    enabled: boolean;
    /** Requests per 5-minute window per IP. Default: 1000 */
    rateLimit?: number;
    /**
     * ARN of an existing WAFv2 WebACL in us-east-1. When provided, the
     * construct uses this ACL directly instead of creating a new one.
     * Enables cross-region deployments (WebACL in us-east-1, stack elsewhere).
     */
    webAclArn?: string;
  };

  /**
   * Enable build caching. Preserves framework build cache (e.g. `.next/cache`)
   * between deploys via S3.
   *
   * When enabled, an S3 bucket is provisioned (or a user-provided bucket is used)
   * and the bucket name is exported as a CfnOutput and set as the
   * `AMPLIFY_BUILD_CACHE_BUCKET` environment variable on compute functions.
   * Users sync the cache in their CI pipeline.
   * @example
   * ```typescript
   * defineHosting({
   *   buildCache: { enabled: true },
   * });
   * ```
   */
  buildCache?: {
    enabled: boolean;
    /** S3 bucket to store build cache. If not provided, creates one. */
    bucket?: IBucket;
  };

  /**
   * Compute (Lambda) configuration for SSR frameworks.
   * Ignored for SPA and static site deployments.
   */
  compute?: {
    /** Lambda memory size in MB. Default: 1024 */
    memorySize?: number;
    /** Lambda timeout. Default: 30 seconds. */
    timeout?: Duration;
    /** Reserved concurrent executions. Default: undefined (no reservation). */
    reservedConcurrency?: number;
    /** Provisioned concurrency for cold-start elimination. Default: undefined (no provisioning). */
    provisionedConcurrency?: number;
    /** CloudWatch log retention for the SSR Lambda. Default: TWO_WEEKS. */
    logRetention?: RetentionDays;
  };

  /**
   * Custom environment variables injected into all compute Lambda functions at runtime.
   *
   * Values appear in plaintext in the CloudFormation template. For sensitive values
   * (database passwords, API secrets), use AWS Systems Manager Parameter Store or
   * Secrets Manager and read them at runtime instead.
   *
   * Safe for: feature flags, non-secret URLs, region config, service names.
   * @example
   * ```typescript
   * defineHosting({
   *   environment: {
   *     DATABASE_URL: process.env.DATABASE_URL,
   *     FEATURE_FLAGS_API_KEY: process.env.FF_KEY,
   *   },
   * });
   * ```
   */
  environment?: Record<string, string>;

  /**
   * Custom error page configuration.
   * Provide paths to HTML files for custom 404 and 500 error responses.
   * @example
   * ```typescript
   * defineHosting({
   *   errorPages: {
   *     notFound: './public/404.html',
   *     serverError: './public/500.html',
   *   },
   * });
   * ```
   */
  errorPages?: {
    /** Path to a custom 404 HTML file (relative to project root). */
    notFound?: string;
    /** Path to a custom 500 HTML file (relative to project root). */
    serverError?: string;
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

  /**
   * The S3 bucket used for build caching (when `buildCache.enabled` is true).
   */
  buildCacheBucket?: Bucket;
};
