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
    /** Lambda memory size in MB. Default: 1024 */
    memorySize?: number;
    /** Lambda timeout. Default: 30 seconds. */
    timeout?: Duration;
    /** Reserved concurrent executions. Default: undefined (no reservation). */
    reservedConcurrency?: number;
    /** Provisioned concurrency for cold-start elimination. Default: undefined (no provisioning). */
    provisionedConcurrency?: number;
    /** CloudWatch log retention for the SSR Lambda. Default: ONE_MONTH. */
    logRetention?: RetentionDays;
    /**
     * 2.1 — synthetic warmup. When set, an EventBridge schedule
     * invokes the SSR Lambda every `rate` to keep at least one
     * execution environment hot, eliminating cold starts on
     * intermittent traffic. Skipped automatically when
     * `provisionedConcurrency` is set (already warm).
     *
     * Cost: ~$0.01/month per minute of rate (Lambda invoke +
     * EventBridge rule).
     */
    warmup?: {
      rate: Duration;
    };
    /**
     * 4.1 — OpenTelemetry environment hooks. Injected onto every
     * Lambda the construct creates (SSR, image-opt, revalidation,
     * middleware, warmup). The construct does NOT install any OTel
     * SDK — this only sets the env vars the user's instrumentation
     * code reads.
     */
    tracing?: {
      /** OTEL_EXPORTER_OTLP_ENDPOINT — collector base URL. */
      otelEndpoint: string;
      /**
       * OTEL_EXPORTER_OTLP_HEADERS — comma-separated `key=value`
       * pairs (auth tokens, vendor headers).
       */
      otelHeaders?: string;
      /** OTEL_SERVICE_NAME — defaults to `amplify-hosting`. */
      serviceName?: string;
    };
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
    /** Days to retain build artifacts in S3. Default: 30. */
    buildRetentionDays?: number;
    /**
     * Opt-in S3 inventory of `builds/` (3.3). When enabled, a daily
     * CSV report of every object under `builds/` lands in a
     * dedicated inventory bucket. Useful for cost audits — find
     * which build is the heavy one without `aws s3 ls --summarize`
     * per prefix. Off by default.
     */
    inventory?: {
      enabled: boolean;
    };
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

  /**
   * CloudWatch alarm wiring. **Enabled by default** so users get
   * out-of-the-box visibility into CloudFront 5xx rate, SSR Lambda
   * errors/throttles, image-opt errors, and revalidation DLQ depth.
   * Idle cost is a few cents per month per alarm — set
   * `monitoring: { enabled: false }` to opt out.
   *
   * If `snsTopicArn` is omitted, an SNS topic is created and surfaced
   * via the construct's `monitoringTopic` field for the caller to
   * subscribe to.
   */
  monitoring?: {
    /** @default true */
    enabled?: boolean;
    /**
     * BYO SNS topic ARN for alarm actions. When omitted, an SNS topic
     * is created.
     */
    snsTopicArn?: string;
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
