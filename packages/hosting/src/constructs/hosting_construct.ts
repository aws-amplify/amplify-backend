import * as fs from 'node:fs';
import * as path from 'node:path';
import { Construct } from 'constructs';
import { CfnOutput, Duration, Fn, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  Distribution,
  IResponseHeadersPolicy,
  PriceClass,
  ResponseHeadersPolicy,
  experimental,
} from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import {
  BucketDeployment,
  CacheControl,
  Source,
} from 'aws-cdk-lib/aws-s3-deployment';
import {
  Code,
  FunctionUrl,
  IVersion,
  Function as LambdaFunction,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Rule, RuleTargetInput, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs';
import { DeployManifest } from '../manifest/types.js';
import { HostingError } from '../hosting_error.js';
import { HostingResources } from '../types.js';
import { ERROR_PAGE_KEY, generateBuildId } from '../defaults.js';
import { StorageConstruct } from './storage_construct.js';
import { ComputeConstruct } from './compute_construct.js';
import { WafConstruct } from './waf_construct.js';
import { DnsConstruct } from './dns_construct.js';
import { createSecurityHeadersPolicy } from './security_headers.js';
import { CdnConstruct } from './cdn_construct.js';
import { MonitoringConstruct } from './monitoring_construct.js';
import { ITopic, Topic } from 'aws-cdk-lib/aws-sns';

// Re-export build ID helpers for public API + tests
export { generateBuildIdFunctionCode, generateBuildId } from '../defaults.js';
export type { SkewProtectionConfig } from './skew_protection.js';

// ---- Public types ----

/**
 * Domain configuration for custom domain support.
 */
export type HostingDomainConfig = {
  domainName: string;
  hostedZone: string;
  /** BYO certificate — avoids deprecated DnsValidatedCertificate when provided. */
  certificate?: ICertificate;
};

/**
 * WAF configuration for CloudFront protection.
 */
export type HostingWafConfig = {
  enabled: boolean;
  /** Requests per 5-minute window per IP. Default: 1000 */
  rateLimit?: number;
};

/**
 * Props for the AmplifyHostingConstruct.
 *
 * This construct is FRAMEWORK-AGNOSTIC. It reads a DeployManifest and
 * provisions infrastructure accordingly. It never imports Next.js or OpenNext.
 */
export type AmplifyHostingConstructProps = {
  /** Deploy manifest produced by the framework adapter. */
  manifest: DeployManifest;
  /**
   * Skips region validation for WAF WebACL (must be us-east-1 for CloudFront),
   * ACM certificates (must be us-east-1 for CloudFront), and Lambda Web Adapter
   * compatibility checks. Useful for testing.
   */
  skipRegionValidation?: boolean;

  /** Custom domain configuration. */
  domain?: HostingDomainConfig;
  /** WAF configuration. */
  waf?: HostingWafConfig;
  /** Compute (Lambda) overrides for all compute resources. */
  compute?: {
    memorySize?: number;
    /**
     * Lambda timeout. Accepts either a `cdk.Duration` (preferred) or a
     * number of seconds for ergonomics — the L3 normalizes both to
     * `Duration` before handing them to the Lambda construct. A plain
     * number used to slip through the type at the user-facing API
     * surface (e.g. when consumed via JS-compiled wrappers) and crash
     * synth deep inside aws-cdk-lib with `props.timeout.toSeconds is
     * not a function`. Coercing here makes that surface forgiving.
     */
    timeout?: Duration | number;
    reservedConcurrency?: number;
    logRetention?: RetentionDays;
    /**
     * Additional environment variables to inject into all compute Lambda
     * functions. Merged with (and overrides) any environment variables
     * declared in the deploy manifest's compute resources.
     */
    environment?: Record<string, string>;
    /** 2.1 — synthetic warmup schedule. */
    warmup?: { rate: Duration };
    /** 4.1 — OpenTelemetry env hooks for SSR / image-opt / revalidation Lambdas. */
    tracing?: {
      otelEndpoint: string;
      otelHeaders?: string;
      serviceName?: string;
    };
  };
  /** CDN (CloudFront) configuration. */
  cdn?: {
    priceClass?: PriceClass;
    contentSecurityPolicy?: string;
    geoRestriction?: {
      type: 'whitelist' | 'blacklist';
      countries: string[];
    };
    /**
     * Default TTL for SSR/compute cache behaviors when the origin response
     * does not include a `Cache-Control` header. Set this to enable
     * CloudFront edge caching of SSR responses and improve hit ratio.
     *
     * When set, SSR responses without an explicit `Cache-Control` header
     * are cached at the edge for this duration. The origin can always
     * override via `s-maxage` or `no-store`.
     * @default Duration.seconds(0) — no caching unless origin opts in
     */
    ssrDefaultTtl?: Duration;
    /**
     * Bring-your-own ResponseHeadersPolicy. When provided, the construct
     * skips creating its own policy — use this to share a single policy
     * across multiple hosting stacks and avoid the account-level limit
     * (default 20, max 200 via service-quota increase).
     *
     * Create a shared policy once (e.g. in a shared-infra stack):
     * ```ts
     * const sharedPolicy = new ResponseHeadersPolicy(sharedStack, 'SharedPolicy', { ... });
     * ```
     * Then import by ID in each hosting stack:
     * ```ts
     * cdn: { responseHeadersPolicy: ResponseHeadersPolicy.fromResponseHeadersPolicyId(this, 'Imported', policyId) }
     * ```
     */
    responseHeadersPolicy?: IResponseHeadersPolicy;
    /**
     * ARN of an existing WAFv2 WebACL to associate with the CloudFront
     * distribution. Use this when you manage WAF rules externally (e.g.
     * via a shared security account) or need advanced WAF features beyond
     * the built-in `waf.enabled` rate-limiting.
     *
     * Takes precedence over `waf.enabled` — when set, the built-in WAF
     * construct is not created.
     */
    webAclArn?: string;
  };
  /** S3 storage configuration. */
  storage?: {
    encryption?: 'S3_MANAGED' | 'KMS';
    encryptionKey?: IKey;
    retainOnDelete?: boolean;
    buildRetentionDays?: number;
    /** 3.3 — opt-in daily S3 inventory of `builds/`. */
    inventory?: { enabled: boolean };
  };
  /** CloudFront access logging configuration. */
  logging?: {
    enabled: boolean;
    retentionDays?: number;
  };
  /** Custom environment variables for all compute functions. */
  environment?: Record<string, string>;
  /**
   * Custom error page configuration.
   * Provide paths to HTML files for custom 404 and 500 error responses.
   */
  errorPages?: {
    /** Path to a custom 404 HTML file (relative to project root). */
    notFound?: string;
    /** Path to a custom 500 HTML file (relative to project root). */
    serverError?: string;
  };
  /**
   * Default CloudWatch alarms (P3.1 + P3.2). On by default. When
   * enabled, the L3 wires CloudFront 5xx, Lambda error / throttle,
   * and revalidation-DLQ alarms to an SNS topic. Opt out with
   * `{ enabled: false }`. See `MonitoringConstruct`.
   */
  monitoring?: {
    /** @default true */
    enabled?: boolean;
    snsTopicArn?: string;
  };
  /**
   * Cookie-based skew protection.
   * When enabled, users mid-session keep receiving assets from their original
   * build, preventing asset mismatches during rolling deployments.
   * @default \{ enabled: true \} — skew protection is enabled by default.
   * Set `\{ enabled: false \}` to disable.
   */
  skewProtection?: {
    enabled: boolean;
    /** How long to honor old build cookies (seconds). Default: 86400 (24h) */
    maxAge?: number;
  };
};

// ---- Main construct ----

/**
 * Unified, manifest-driven hosting construct.
 *
 * Always creates: S3 bucket (private, BLOCK_ALL), CloudFront distribution,
 * OAC, atomic deployment with Build ID.
 *
 * Provisions based on manifest content:
 * - compute entries → Lambda functions (handler/http-server/edge types)
 * - cache config → S3 cache bucket + DynamoDB tags table + SQS revalidation queue
 * - imageOptimization → separate image Lambda
 * - middleware → Lambda\@Edge or CloudFront Function
 * - domain config → ACM certificate + Route 53 + CF aliases
 * - waf.enabled → WAFv2 WebACL
 */
export class AmplifyHostingConstruct extends Construct {
  readonly bucket: Bucket;
  readonly distribution: Distribution;
  readonly distributionUrl: string;
  readonly computeFunctions: Map<
    string,
    LambdaFunction | experimental.EdgeFunction
  > = new Map();
  readonly computeFunctionUrls: Map<string, FunctionUrl> = new Map();
  readonly certificate?: ICertificate;
  readonly hostedZone?: IHostedZone;
  readonly webAcl?: CfnWebACL;
  readonly cacheTable?: Table;
  readonly revalidationQueue?: Queue;
  readonly revalidationDlq?: Queue;
  readonly cacheBucket?: Bucket;
  /**
   * SNS topic alarm actions are sent to. Set when monitoring is on
   * (the default). The user subscribes (email, Slack via webhook,
   * PagerDuty, etc.) via `monitoringTopic.addSubscription(...)` or by
   * configuring an external listener with the topic ARN.
   *
   * Not declared `readonly` because the `MonitoringConstruct` that
   * owns the topic is built mid-constructor (after the SSR / image-opt
   * Lambdas it alarms on are wired up), so the value is assigned
   * after the field declaration runs. Treat it as logically immutable
   * post-construction — do not reassign from outside the constructor.
   */
  monitoringTopic?: ITopic;

  /**
   * Creates the hosting infrastructure from a framework-agnostic deploy manifest.
   */
  constructor(
    scope: Construct,
    id: string,
    props: AmplifyHostingConstructProps,
  ) {
    super(scope, id);

    const { manifest } = props;
    // Rewrites stub: adapters lift `routeRules.proxy` (Nitro) and
    // similar upstream-proxy rules into `manifest.rewrites[]`, but the
    // L3 doesn't yet provision the per-pattern `HttpOrigin` +
    // CloudFront-Function origin-rewrite needed to honor them. Until
    // that lands, fail loud rather than silently dropping the user's
    // intent — `routeRules.proxy: 'https://upstream/**'` would
    // otherwise fall through to the SSR Lambda which relays the proxy,
    // burning a Lambda invocation per request with no operator-visible
    // signal that the rule didn't take effect.
    if (manifest.rewrites && manifest.rewrites.length > 0) {
      throw new HostingError('RewritesNotYetSupportedError', {
        message:
          `manifest.rewrites[] is not yet consumed by the hosting L3 (received ${manifest.rewrites.length} rule(s)). ` +
          `Adapters lift Nitro routeRules.proxy and similar upstream-proxy rules here; the L3 wiring (per-pattern HttpOrigin + CloudFront-Function origin-rewrite) is tracked separately.`,
        resolution:
          'Until the L3 wiring lands, remove proxy rules from your framework config and inline the upstream call in your SSR handler. Track the gap on the hosting roadmap before re-introducing routeRules.proxy.',
      });
    }
    const buildId = manifest.buildId ?? generateBuildId();

    // Normalize `compute.timeout` once: callers consuming the L3 from
    // JS-compiled wrappers (or strict TS users who write
    // `timeout: 30`) often pass a plain number, which then crashes
    // deep inside aws-cdk-lib with `props.timeout.toSeconds is not a
    // function`. Accepting a number here and coercing to `Duration`
    // turns that into a forgiving, well-typed surface.
    const computeTimeout = normalizeTimeout(props.compute?.timeout);

    // ---- 1. Storage (S3 buckets) ----
    const storage = new StorageConstruct(this, 'Storage', {
      retainOnDelete: props.storage?.retainOnDelete,
      accessLogging: props.logging?.enabled ?? true,
      encryption: props.storage?.encryption,
      encryptionKey: props.storage?.encryptionKey,
      buildRetentionDays: props.storage?.buildRetentionDays,
      logRetentionDays: props.logging?.retentionDays,
      // 3.2 — adapter-supplied lifecycle rules; storage construct
      // turns each `{prefix, days}` entry into an S3 lifecycle rule.
      extraLifecycleRules: manifest.lifecycle,
      // 3.3 — opt-in S3 inventory. Off by default. When enabled,
      // a daily CSV inventory of `builds/` lands in the access log
      // bucket so operators can audit per-build sizes.
      inventoryEnabled: props.storage?.inventory?.enabled === true,
    });
    this.bucket = storage.bucket;

    // ---- 2. Compute resources ----
    const computeEntries = Object.entries(manifest.compute);
    const hasCompute = computeEntries.length > 0;

    for (const [name, resource] of computeEntries) {
      if (resource.type === 'edge') {
        const edgeConstruct = new ComputeConstruct(this, `Compute-${name}`, {
          name,
          computeResource: resource,
          memorySize: props.compute?.memorySize,
          timeout: computeTimeout,
          reservedConcurrency: props.compute?.reservedConcurrency,
          logRetention: props.compute?.logRetention,
          skipRegionValidation: props.skipRegionValidation,
          environment: props.compute?.environment,
        });
        this.computeFunctions.set(name, edgeConstruct.function);
        continue;
      }

      // SSR compute is fronted by REST API (cdn_construct.ts), not by a
      // Function URL. Image-opt etc. keep OAC + Function URL.
      const isSsrCompute = name === 'default' || name === 'server';

      const computeConstruct = new ComputeConstruct(this, `Compute-${name}`, {
        name,
        computeResource: resource,
        memorySize: props.compute?.memorySize,
        timeout: computeTimeout,
        reservedConcurrency: props.compute?.reservedConcurrency,
        logRetention: props.compute?.logRetention,
        skipRegionValidation: props.skipRegionValidation,
        skipFunctionUrl: isSsrCompute,
        environment: props.compute?.environment,
      });

      this.computeFunctions.set(name, computeConstruct.function);
      if (computeConstruct.functionUrl) {
        this.computeFunctionUrls.set(name, computeConstruct.functionUrl);
      }
    }

    // ---- 3. Cache infrastructure (ISR) ----
    if (manifest.cache && manifest.cache.driver === 'nitro-s3') {
      // Nitro path: a single S3 bucket fronts Nitro's `useStorage('cache')`
      // mount via the plugin the adapter injected at build time. No DDB,
      // no SQS, no separate worker — Nitro handles refresh inline.
      this.cacheBucket = new Bucket(this, 'NitroCacheBucket', {
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        // Nitro stores its own per-key expiry inside each value;
        // this lifecycle rule is a safety net for orphaned objects.
        lifecycleRules: [{ expiration: Duration.days(7) }],
      });

      const cacheComputeName = manifest.cache.computeResource;
      const cacheFunction = this.computeFunctions.get(cacheComputeName);
      if (!cacheFunction) {
        throw new HostingError('CacheComputeResourceNotFoundError', {
          message: `Cache config references compute resource '${cacheComputeName}' but it was not found in manifest.compute`,
          resolution:
            'Ensure cache.computeResource matches a key in the compute map.',
        });
      }
      this.cacheBucket.grantReadWrite(cacheFunction);

      if (cacheFunction instanceof LambdaFunction) {
        cacheFunction.addEnvironment(
          'AMPLIFY_NITRO_CACHE_BUCKET',
          this.cacheBucket.bucketName,
        );
        cacheFunction.addEnvironment(
          'AMPLIFY_NITRO_CACHE_REGION',
          Stack.of(this).region,
        );
      }
    } else if (manifest.cache) {
      // OpenNext path (default when `driver` is absent or 'opennext').
      // S3 bucket for ISR cache
      this.cacheBucket = new Bucket(this, 'CacheBucket', {
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        lifecycleRules: [{ expiration: Duration.days(30) }],
      });

      // DynamoDB table for tag-based revalidation
      if (manifest.cache.tagRevalidation) {
        this.cacheTable = new Table(this, 'CacheTagTable', {
          partitionKey: { name: 'tag', type: AttributeType.STRING },
          sortKey: { name: 'path', type: AttributeType.STRING },
          billingMode: BillingMode.PAY_PER_REQUEST,
          removalPolicy: RemovalPolicy.DESTROY,
          timeToLiveAttribute: 'ttl',
        });

        // GSI required by OpenNext's tag cache handler for path-based lookups
        this.cacheTable.addGlobalSecondaryIndex({
          indexName: 'revalidate',
          partitionKey: { name: 'path', type: AttributeType.STRING },
          sortKey: { name: 'revalidatedAt', type: AttributeType.NUMBER },
        });
      }

      // SQS queue for async revalidation (FIFO required — OpenNext sends
      // MessageDeduplicationId and MessageGroupId with revalidation messages)
      if (manifest.cache.revalidationQueue) {
        // Hold a reference to the DLQ on the construct so the
        // monitoring construct can attach an alarm to it later.
        this.revalidationDlq = new Queue(this, 'RevalidationDLQ', {
          fifo: true,
          retentionPeriod: Duration.days(14),
          encryption: QueueEncryption.SQS_MANAGED,
        });

        this.revalidationQueue = new Queue(this, 'RevalidationQueue', {
          fifo: true,
          contentBasedDeduplication: true,
          visibilityTimeout: Duration.seconds(30),
          retentionPeriod: Duration.days(1),
          encryption: QueueEncryption.SQS_MANAGED,
          deadLetterQueue: {
            queue: this.revalidationDlq,
            maxReceiveCount: 3,
          },
        });

        new CfnOutput(this, 'RevalidationQueueUrl', {
          value: this.revalidationQueue.queueUrl,
          description: 'URL of the ISR revalidation SQS queue',
        });
      }

      // Revalidation worker Lambda — processes SQS messages to refresh stale pages
      if (manifest.cache.revalidationFunction && this.revalidationQueue) {
        const revalidationLogGroup = new LogGroup(
          this,
          'RevalidationLogGroup',
          {
            retention: props.compute?.logRetention ?? RetentionDays.TWO_WEEKS,
            removalPolicy: RemovalPolicy.DESTROY,
          },
        );

        const revalidationFn = new LambdaFunction(
          this,
          'RevalidationFunction',
          {
            runtime: Runtime.NODEJS_20_X,
            handler: manifest.cache.revalidationFunction.handler,
            code: Code.fromAsset(manifest.cache.revalidationFunction.bundle),
            timeout: Duration.seconds(30),
            memorySize: 256,
            logGroup: revalidationLogGroup,
            environment: {
              CACHE_BUCKET_NAME: this.cacheBucket.bucketName,
              CACHE_BUCKET_REGION: Stack.of(this).region,
              OPEN_NEXT_BUILD_ID: buildId,
              ...(this.cacheTable
                ? { CACHE_DYNAMO_TABLE: this.cacheTable.tableName }
                : {}),
            },
          },
        );

        this.cacheBucket.grantReadWrite(revalidationFn);
        if (this.cacheTable) {
          this.cacheTable.grantReadWriteData(revalidationFn);
        }

        revalidationFn.addEventSource(
          new SqsEventSource(this.revalidationQueue, { batchSize: 5 }),
        );

        this.computeFunctions.set('revalidation', revalidationFn);
      }

      // Grant cache access to the target compute resource
      const cacheComputeName = manifest.cache.computeResource;
      const cacheFunction = this.computeFunctions.get(cacheComputeName);
      if (!cacheFunction) {
        throw new HostingError('CacheComputeResourceNotFoundError', {
          message: `Cache config references compute resource '${cacheComputeName}' but it was not found in manifest.compute`,
          resolution:
            'Ensure cache.computeResource matches a key in the compute map.',
        });
      }
      this.cacheBucket.grantReadWrite(cacheFunction);
      if (this.cacheTable) {
        this.cacheTable.grantReadWriteData(cacheFunction);
      }
      if (this.revalidationQueue) {
        this.revalidationQueue.grantSendMessages(cacheFunction);
        this.revalidationQueue.grantConsumeMessages(cacheFunction);
      }

      // ISR environment variables
      if (cacheFunction instanceof LambdaFunction) {
        cacheFunction.addEnvironment(
          'CACHE_BUCKET_NAME',
          this.cacheBucket.bucketName,
        );
        cacheFunction.addEnvironment(
          'CACHE_BUCKET_REGION',
          Stack.of(this).region,
        );
        cacheFunction.addEnvironment('OPEN_NEXT_BUILD_ID', buildId);
        if (this.cacheTable) {
          cacheFunction.addEnvironment(
            'CACHE_DYNAMO_TABLE',
            this.cacheTable.tableName,
          );
        }
        if (this.revalidationQueue) {
          cacheFunction.addEnvironment(
            'REVALIDATION_QUEUE_URL',
            this.revalidationQueue.queueUrl,
          );
          cacheFunction.addEnvironment(
            'REVALIDATION_QUEUE_REGION',
            Stack.of(this).region,
          );
        }
      }
    }

    // ---- 4. Image optimization Lambda ----
    if (manifest.imageOptimization) {
      const imageConstruct = new ComputeConstruct(this, 'ImageOptimization', {
        name: 'image-optimization',
        computeResource: {
          type: 'handler',
          bundle: manifest.imageOptimization.bundle,
          handler: manifest.imageOptimization.handler,
          placement: 'regional',
          streaming: false,
          memorySize: 1024,
          timeout: 25,
        },
        reservedConcurrency: 10,
        // Propagate the SSR Lambda's logRetention to image-opt so a
        // user who bumped retention for debugability gets the same
        // window for image-opt logs (intermittent SVG/SSRF rejects
        // and remote-pattern misses live here).
        logRetention: props.compute?.logRetention,
        skipRegionValidation: props.skipRegionValidation,
      });
      this.computeFunctions.set('image-optimization', imageConstruct.function);
      if (imageConstruct.functionUrl) {
        this.computeFunctionUrls.set(
          'image-optimization',
          imageConstruct.functionUrl,
        );
      }
      // Image optimization needs to read original images from the assets bucket
      this.bucket.grantRead(imageConstruct.function);

      // Environment variables required by OpenNext image optimization
      if (imageConstruct.function instanceof LambdaFunction) {
        imageConstruct.function.addEnvironment(
          'BUCKET_NAME',
          this.bucket.bucketName,
        );
        imageConstruct.function.addEnvironment(
          'BUCKET_KEY_PREFIX',
          `builds/${buildId}`,
        );
        imageConstruct.function.addEnvironment(
          'BUCKET_REGION',
          Stack.of(this).region,
        );
        // Adapter-supplied env (e.g. IPX_BASE_URL for @nuxt/image
        // when the user customizes `runtimeConfig.ipx.baseURL`).
        if (manifest.imageOptimization.environment) {
          for (const [key, value] of Object.entries(
            manifest.imageOptimization.environment,
          )) {
            imageConstruct.function.addEnvironment(key, value);
          }
        }

        // Image-opt safety knobs (Piece 4). These mirror the
        // user-facing names from Next.js / Astro. OpenNext's image-opt
        // adapter reads its config from a bundled `nextConfig` rather
        // than process env, so these env vars are written here for
        // forward-compat — the framework-side runtime can pick them up
        // when it migrates to env-based config.
        if (manifest.imageOptimization.dangerouslyAllowSVG !== undefined) {
          imageConstruct.function.addEnvironment(
            'IMAGE_ALLOW_SVG',
            String(manifest.imageOptimization.dangerouslyAllowSVG),
          );
        }
        if (manifest.imageOptimization.minimumCacheTTL !== undefined) {
          imageConstruct.function.addEnvironment(
            'IMAGE_MIN_CACHE_TTL',
            String(manifest.imageOptimization.minimumCacheTTL),
          );
        }
        if (
          manifest.imageOptimization.remotePatterns &&
          manifest.imageOptimization.remotePatterns.length > 0
        ) {
          imageConstruct.function.addEnvironment(
            'IMAGE_REMOTE_PATTERNS',
            JSON.stringify(manifest.imageOptimization.remotePatterns),
          );
        }
        // Astro `image.domains` / Next.js `images.domains` ship as a
        // CSV of bare hostnames — simpler shape than remotePatterns,
        // honored by the IPX runtime allowlist (P0.1 enforcement).
        if (
          manifest.imageOptimization.domains &&
          manifest.imageOptimization.domains.length > 0
        ) {
          imageConstruct.function.addEnvironment(
            'IMAGE_ALLOWED_HOSTNAMES',
            manifest.imageOptimization.domains.join(','),
          );
        }
        // 4.1 — Image-opt parity with framework knobs. The manifest
        // already carries the framework's resolved `formats` and
        // `sizes` (Next: `images.formats`/`deviceSizes`; Astro: same
        // shape via Astro 5 image config). Forward them to the IPX
        // runtime as CSV env so the Lambda emits only the formats /
        // sizes the framework expects. Today the IPX runtime ignores
        // these (forward-compat); when the runtime starts honoring
        // them, no CDK churn is needed.
        if (manifest.imageOptimization.formats.length > 0) {
          imageConstruct.function.addEnvironment(
            'IMAGE_FORMATS',
            manifest.imageOptimization.formats.join(','),
          );
        }
        if (manifest.imageOptimization.sizes.length > 0) {
          imageConstruct.function.addEnvironment(
            'IMAGE_DEVICE_SIZES',
            manifest.imageOptimization.sizes.join(','),
          );
        }
      }
    }

    // ---- 5. Middleware (Lambda@Edge) ----
    let middlewareEdgeVersion: IVersion | undefined;
    if (manifest.middleware) {
      const middlewareConstruct = new ComputeConstruct(this, 'Middleware', {
        name: 'middleware',
        computeResource: {
          type: 'edge',
          bundle: manifest.middleware.bundle,
          handler: manifest.middleware.handler,
          placement: 'global',
          streaming: false,
          timeout: 5,
          memorySize: 128,
        },
        // Lambda@Edge logs land in us-east-1 + every PoP region. The
        // L3 still passes logRetention so all replicas honor the same
        // window — the singleton custom-resource-driven retention
        // would have churned per-region log groups on every redeploy.
        logRetention: props.compute?.logRetention,
        skipRegionValidation: props.skipRegionValidation,
      });
      this.computeFunctions.set('middleware', middlewareConstruct.function);
      middlewareEdgeVersion = middlewareConstruct.function.currentVersion;
    }

    // ---- 5a. User-provided environment variables (applied to ALL compute functions) ----
    const RESERVED_PREFIXES = [
      'AWS_',
      'AMPLIFY_',
      'OPEN_NEXT_',
      'CACHE_',
      'REVALIDATION_',
      'NODE_',
      'LAMBDA_',
    ];
    const RESERVED_EXACT_KEYS = new Set([
      '_HANDLER',
      'LD_PRELOAD',
      '_X_AMZN_TRACE_ID',
    ]);
    const KEY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

    if (props.environment) {
      for (const key of Object.keys(props.environment)) {
        if (!KEY_PATTERN.test(key)) {
          throw new HostingError('InvalidEnvironmentKeyError', {
            message: `Environment variable key '${key}' contains invalid characters.`,
            resolution:
              'Keys must match [a-zA-Z_][a-zA-Z0-9_]* (letters, numbers, underscores only, cannot start with a number).',
          });
        }
        if (RESERVED_PREFIXES.some((p) => key.startsWith(p))) {
          throw new HostingError('ReservedEnvironmentKeyError', {
            message: `Environment variable key '${key}' uses a reserved prefix.`,
            resolution: `Keys starting with ${RESERVED_PREFIXES.join(', ')} are reserved for internal use.`,
          });
        }
        if (RESERVED_EXACT_KEYS.has(key)) {
          throw new HostingError('ReservedEnvironmentKeyError', {
            message: `Environment variable key '${key}' is a reserved runtime key.`,
            resolution: `The key '${key}' is reserved by the Lambda runtime and cannot be overridden.`,
          });
        }
        if (key.length > 256) {
          throw new HostingError('EnvironmentKeyTooLongError', {
            message: `Environment variable key '${key}' exceeds 256 character limit.`,
            resolution:
              'Lambda environment variable keys must be 256 characters or fewer.',
          });
        }
        const value = props.environment[key];
        if (value.length > 8192) {
          throw new HostingError('EnvironmentValueTooLongError', {
            message: `Environment variable value for '${key}' exceeds 8KB limit.`,
            resolution:
              'Lambda environment variable values must be 8192 characters or fewer.',
          });
        }
      }

      for (const [, fn] of this.computeFunctions.entries()) {
        if (fn instanceof LambdaFunction) {
          for (const [key, value] of Object.entries(props.environment)) {
            fn.addEnvironment(key, value);
          }
        }
      }
    }

    // ---- 5b. OpenTelemetry env hooks (4.1) ----
    // When the user opts into `compute.tracing`, stamp the OTEL_*
    // env vars onto every regional Lambda the construct created.
    // The construct does NOT install any OTel SDK — instrumentation
    // is the user's responsibility (drop-in via NODE_OPTIONS,
    // OpenTelemetry Lambda Layer, manually wired SDK, etc.). All
    // we do here is honor the contract the OTel collector ecosystem
    // expects: OTEL_EXPORTER_OTLP_ENDPOINT / _HEADERS / OTEL_SERVICE_NAME.
    //
    // Lambda@Edge functions are skipped — Lambda@Edge does not
    // support env vars (the runtime simply discards them).
    if (props.compute?.tracing) {
      const tracing = props.compute.tracing;
      const serviceName = tracing.serviceName ?? 'amplify-hosting';
      for (const [name, fn] of this.computeFunctions) {
        if (!(fn instanceof LambdaFunction)) continue;
        fn.addEnvironment('OTEL_EXPORTER_OTLP_ENDPOINT', tracing.otelEndpoint);
        if (tracing.otelHeaders) {
          fn.addEnvironment('OTEL_EXPORTER_OTLP_HEADERS', tracing.otelHeaders);
        }
        // Per-function service name disambiguates traces in
        // collectors that aggregate by service. e.g. `<base>-ssr`,
        // `<base>-image-optimization`, `<base>-revalidation`.
        fn.addEnvironment(
          'OTEL_SERVICE_NAME',
          name === 'default' || name === 'server'
            ? `${serviceName}-ssr`
            : `${serviceName}-${name}`,
        );
      }
    }

    // ---- 5c. Synthetic warmup schedule (2.1) ----
    // EventBridge schedule → SSR Lambda invoke every N. Customers
    // using `provisionedConcurrency` are already warm, so we skip
    // the warmup wiring there to avoid double-paying. Image-opt and
    // revalidation are not warmed by default — they're inherently
    // bursty and provisioned-concurrency is a better fit.
    if (
      props.compute?.warmup &&
      !manifest.compute.default?.provisionedConcurrency &&
      !manifest.compute.server?.provisionedConcurrency
    ) {
      const ssrComputeName = this.computeFunctions.has('default')
        ? 'default'
        : this.computeFunctions.has('server')
          ? 'server'
          : undefined;
      const ssrFn = ssrComputeName
        ? this.computeFunctions.get(ssrComputeName)
        : undefined;
      if (ssrFn instanceof LambdaFunction) {
        const rule = new Rule(this, 'WarmupSchedule', {
          schedule: Schedule.rate(props.compute.warmup.rate),
          description:
            '2.1 — keep SSR Lambda warm with a synthetic invoke every N.',
        });
        // The synthetic event carries a marker header so the user's
        // SSR handler can short-circuit (skip rendering work, skip
        // logging the invocation as production traffic).
        rule.addTarget(
          new LambdaFunctionTarget(ssrFn, {
            event: RuleTargetInput.fromObject({
              source: 'amplify-hosting-warmup',
              version: '1',
            }),
          }),
        );
      }
    }

    // ---- 6. WAF (conditional) ----
    // Only create the built-in WAF construct if user didn't provide their own ARN
    if (!props.cdn?.webAclArn) {
      const wafConstruct = new WafConstruct(this, 'Waf', {
        enabled: props.waf?.enabled ?? false,
        rateLimit: props.waf?.rateLimit,
        skipRegionValidation: props.skipRegionValidation,
      });
      this.webAcl = wafConstruct.webAcl;
    }

    // ---- 7. Custom domain resources (conditional) ----
    let dnsConstruct: DnsConstruct | undefined;
    if (props.domain) {
      dnsConstruct = new DnsConstruct(this, 'Dns', {
        domainName: props.domain.domainName,
        hostedZone: props.domain.hostedZone,
        certificate: props.domain.certificate,
        skipRegionValidation: props.skipRegionValidation,
      });
      this.certificate = dnsConstruct.certificate;
      this.hostedZone = dnsConstruct.hostedZone;
    }

    // ---- 8. Security headers ----
    // Policy selection priority:
    //   1. BYO policy via `cdn.responseHeadersPolicy` — share across stacks.
    //   2. Custom policy when `cdn.contentSecurityPolicy` is configured.
    //   3. Managed SECURITY_HEADERS policy (default) — consumes no quota.
    //
    // The account-level ResponseHeadersPolicy limit is 20 (soft, raisable
    // to 200). Using the managed policy by default avoids quota exhaustion
    // when many hosting stacks deploy to the same account. The managed
    // policy includes HSTS, X-Content-Type-Options, X-Frame-Options,
    // X-XSS-Protection, and Referrer-Policy. CSP is intentionally omitted
    // from the default — frameworks (Next.js, Nuxt) emit their own CSP via
    // response headers, and a blanket L3 CSP would conflict.
    let securityHeadersPolicy: IResponseHeadersPolicy;
    if (props.cdn?.responseHeadersPolicy) {
      securityHeadersPolicy = props.cdn.responseHeadersPolicy;
    } else if (props.cdn?.contentSecurityPolicy) {
      securityHeadersPolicy = createSecurityHeadersPolicy(
        this,
        'SecurityHeaders',
        { contentSecurityPolicy: props.cdn.contentSecurityPolicy },
      );
    } else {
      securityHeadersPolicy = ResponseHeadersPolicy.SECURITY_HEADERS;
    }

    // ---- 9. CloudFront distribution ----
    const manifestWithBuildId: DeployManifest = { ...manifest, buildId };

    // Per-route Lambda@Edge function versions (OpenNext edge routes). Only
    // computes with type === 'edge' get a `currentVersion` from the
    // EdgeFunction CDK construct — middleware is excluded because it has
    // its own dedicated wiring on the default behavior.
    const routeEdgeFunctions = new Map<string, IVersion>();
    for (const [name, resource] of Object.entries(manifest.compute)) {
      if (resource.type !== 'edge') continue;
      if (name === 'middleware') continue;
      const fn = this.computeFunctions.get(name);
      if (fn instanceof experimental.EdgeFunction) {
        routeEdgeFunctions.set(name, fn.currentVersion);
      }
    }

    const cdn = new CdnConstruct(this, 'Cdn', {
      bucket: this.bucket,
      manifest: manifestWithBuildId,
      securityHeadersPolicy,
      contentSecurityPolicy: props.cdn?.contentSecurityPolicy,
      computeFunctionUrls: this.computeFunctionUrls,
      computeFunctions: this.computeFunctions,
      middlewareEdgeFunction: middlewareEdgeVersion,
      routeEdgeFunctions,
      webAcl: this.webAcl,
      certificate: this.certificate,
      domainName: props.domain?.domainName,
      accessLogBucket: storage.accessLogBucket,
      priceClass: props.cdn?.priceClass,
      geoRestriction: props.cdn?.geoRestriction,
      skewProtection: props.skewProtection ?? { enabled: true },
      ssrDefaultTtl: props.cdn?.ssrDefaultTtl,
      webAclArn: props.cdn?.webAclArn,
      customErrorPages: props.errorPages
        ? {
            notFound: !!props.errorPages.notFound,
            serverError: !!props.errorPages.serverError,
          }
        : undefined,
    });

    this.distribution = cdn.distribution;
    this.distributionUrl = cdn.distributionUrl;

    // ---- Deletion ordering: Distribution before AccessLogBucket cleanup ----
    // CloudFront delivers access logs asynchronously. During stack deletion,
    // CDK's autoDeleteObjects Lambda can empty the bucket, but if the
    // distribution is still alive it writes MORE logs before being fully
    // removed — causing "bucket not empty" on the subsequent bucket delete.
    // Adding a DependsOn from the Distribution to the auto-delete custom
    // resource ensures CFN deletes the distribution FIRST (stopping log
    // delivery), THEN fires the auto-delete Lambda to empty the bucket.
    if (storage.accessLogBucket) {
      const autoDeleteCr = storage.accessLogBucket.node.tryFindChild(
        'AutoDeleteObjectsCustomResource',
      );
      if (autoDeleteCr) {
        cdn.distribution.node.addDependency(autoDeleteCr as Construct);
      }
    }

    // ---- 9c. Default CloudWatch alarms (P3.1 + P3.2) ----
    // Enabled by default — alarms cost cents/month idle and the
    // out-of-the-box visibility (CloudFront 5xx, Lambda errors/throttles,
    // image-opt errors, revalidation DLQ depth) is high-value during
    // the construct's validation phase. Opt out with
    // `monitoring: { enabled: false }`. When on, surfaces the SNS topic
    // ARN as a CloudFormation output so operators can wire subscriptions
    // externally without touching the construct again.
    const monitoringEnabled = props.monitoring?.enabled ?? true;
    if (monitoringEnabled) {
      const userTopic = props.monitoring?.snsTopicArn
        ? Topic.fromTopicArn(
            this,
            'AlarmTopicImport',
            props.monitoring.snsTopicArn,
          )
        : undefined;
      const ssrComputeName = this.computeFunctions.has('default')
        ? 'default'
        : this.computeFunctions.has('server')
          ? 'server'
          : undefined;
      const ssrFn = ssrComputeName
        ? this.computeFunctions.get(ssrComputeName)
        : undefined;
      const imgFn = this.computeFunctions.get('image-optimization');
      const monitoring = new MonitoringConstruct(this, 'Monitoring', {
        enabled: true,
        snsTopic: userTopic,
        distribution: this.distribution,
        // Lambda@Edge functions don't accept the CW metric helpers we
        // use; only attach when the SSR compute is a regional Lambda.
        ssrFunction: ssrFn instanceof LambdaFunction ? ssrFn : undefined,
        imageFunction: imgFn instanceof LambdaFunction ? imgFn : undefined,
        revalidationDlq: this.revalidationDlq,
      });
      this.monitoringTopic = monitoring.topic;
      if (monitoring.topic) {
        new CfnOutput(this, 'MonitoringTopicArn', {
          value: monitoring.topic.topicArn,
          description:
            'SNS topic for hosting alarms. Subscribe an email/Slack/PagerDuty endpoint here.',
        });
      }
    }

    // ---- 9a. OPEN_NEXT_ORIGIN env var for URL construction ----
    // OpenNext's origin resolver (pattern-env) reads OPEN_NEXT_ORIGIN as a JSON
    // map of origin names → {host, protocol, port}. Only the primary server
    // function needs this — it enables internal routing to resolve origins for
    // URL construction (avoiding "TypeError: Invalid URL" on path-only rewrites).
    // Image optimization and other secondary compute functions don't need it.
    if (hasCompute) {
      // Identify the primary server function (the one handling SSR routing)
      const primaryComputeName = this.computeFunctions.has('default')
        ? 'default'
        : this.computeFunctions.has('server')
          ? 'server'
          : [...this.computeFunctions.keys()].find(
              (k) => k !== 'image-optimization' && k !== 'middleware',
            );

      if (primaryComputeName) {
        const primaryFn = this.computeFunctions.get(primaryComputeName);
        if (primaryFn && primaryFn instanceof LambdaFunction) {
          // Build origin map with OTHER functions' URLs (not self → avoids cycle)
          const originEntries: string[] = [];
          for (const [urlName, fnUrl] of this.computeFunctionUrls.entries()) {
            if (urlName === primaryComputeName) continue;
            const originKey =
              urlName === 'image-optimization' ? 'imageOptimizer' : urlName;
            const host = Fn.select(2, Fn.split('/', fnUrl.url));
            originEntries.push(
              Fn.join('', [
                `"${originKey}":{"host":"`,
                host,
                `","protocol":"https","port":443}`,
              ]),
            );
          }

          if (originEntries.length > 0) {
            const openNextOriginJson = Fn.join('', [
              '{',
              Fn.join(',', originEntries),
              '}',
            ]);
            primaryFn.addEnvironment('OPEN_NEXT_ORIGIN', openNextOriginJson);
          } else {
            primaryFn.addEnvironment('OPEN_NEXT_ORIGIN', '{}');
          }
        }
      }
    }

    // ---- 9b. KMS decrypt grant for CloudFront OAC ----
    const kmsKey = props.storage?.encryptionKey ?? storage.bucket.encryptionKey;
    if (props.storage?.encryption === 'KMS' && kmsKey) {
      kmsKey.addToResourcePolicy(
        new iam.PolicyStatement({
          actions: ['kms:Decrypt'],
          resources: ['*'],
          principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        }),
      );
    }

    // ---- 10. DNS records ----
    if (props.domain && dnsConstruct) {
      dnsConstruct.createDnsRecords(this.distribution);
    }

    // ---- 11. Error page deployment (SSR only) ----
    if (hasCompute) {
      new BucketDeployment(this, 'ErrorPageDeployment', {
        sources: [Source.data(ERROR_PAGE_KEY, cdn.errorPageHtml)],
        destinationBucket: this.bucket,
        destinationKeyPrefix: `builds/${buildId}/`,
        prune: false,
      });
    }

    // ---- 11a. Custom error pages ----
    if (props.errorPages?.notFound) {
      if (!fs.existsSync(props.errorPages.notFound)) {
        throw new HostingError('CustomErrorPageNotFoundError', {
          message: `Custom 404 error page not found at path: ${props.errorPages.notFound}`,
          resolution:
            'Ensure the notFound path points to an existing HTML file relative to your project root.',
        });
      }
      const notFoundContent = fs.readFileSync(
        props.errorPages.notFound,
        'utf-8',
      );
      if (notFoundContent.length > 50 * 1024) {
        throw new HostingError('ErrorPageTooLargeError', {
          message: `Custom error page at ${props.errorPages.notFound} is ${Math.round(notFoundContent.length / 1024)}KB. Maximum is 50KB.`,
          resolution: 'Reduce the size of your custom error page HTML file.',
        });
      }
      if (
        !notFoundContent.trim().toLowerCase().includes('<html') &&
        !notFoundContent.trim().toLowerCase().includes('<!doctype')
      ) {
        throw new HostingError('InvalidErrorPageContentError', {
          message: `Custom error page at ${props.errorPages.notFound} does not appear to be valid HTML.`,
          resolution:
            'Ensure the file contains valid HTML (should include <html> or <!DOCTYPE> tag).',
        });
      }
      new BucketDeployment(this, 'Custom404Deployment', {
        sources: [Source.data('404.html', notFoundContent)],
        destinationBucket: this.bucket,
        destinationKeyPrefix: `builds/${buildId}/`,
        prune: false,
      });
    }
    if (props.errorPages?.serverError) {
      if (!fs.existsSync(props.errorPages.serverError)) {
        throw new HostingError('CustomErrorPageNotFoundError', {
          message: `Custom 500 error page not found at path: ${props.errorPages.serverError}`,
          resolution:
            'Ensure the serverError path points to an existing HTML file relative to your project root.',
        });
      }
      const serverErrorContent = fs.readFileSync(
        props.errorPages.serverError,
        'utf-8',
      );
      if (serverErrorContent.length > 50 * 1024) {
        throw new HostingError('ErrorPageTooLargeError', {
          message: `Custom error page at ${props.errorPages.serverError} is ${Math.round(serverErrorContent.length / 1024)}KB. Maximum is 50KB.`,
          resolution: 'Reduce the size of your custom error page HTML file.',
        });
      }
      if (
        !serverErrorContent.trim().toLowerCase().includes('<html') &&
        !serverErrorContent.trim().toLowerCase().includes('<!doctype')
      ) {
        throw new HostingError('InvalidErrorPageContentError', {
          message: `Custom error page at ${props.errorPages.serverError} does not appear to be valid HTML.`,
          resolution:
            'Ensure the file contains valid HTML (should include <html> or <!DOCTYPE> tag).',
        });
      }
      new BucketDeployment(this, 'Custom500Deployment', {
        sources: [Source.data('500.html', serverErrorContent)],
        destinationBucket: this.bucket,
        destinationKeyPrefix: `builds/${buildId}/`,
        prune: false,
      });
    }

    // ---- 12. Atomic Deployment (static assets) ----
    // Cache-Control split (3 tiers):
    //
    //   1. Hashed assets (`immutablePaths`): `max-age=31536000, immutable`
    //   2. HTML files: `no-cache, no-store, must-revalidate` — browsers
    //      must always revalidate so new deploys propagate immediately.
    //   3. Other mutable assets (images, JSON, etc.):
    //      `s-maxage=31536000, max-age=0, must-revalidate` — CloudFront
    //      edge caches for 1y (flushed via `/*` invalidation on deploy);
    //      browsers always revalidate.
    //
    // Font MIME pass (12b below): aws s3 sync (driver inside
    // BucketDeployment) infers Content-Type via Python's mimetypes which
    // lacks `font/woff*` on the Lambda runtime — fonts ship as
    // `binary/octet-stream` and browsers reject them under CORS. We
    // re-deploy *only* font extensions with `contentType` set explicitly.
    //
    // Source-asset reuse: every BucketDeployment below uses the SAME
    // `Source.asset(directory)` instance. CDK staging ZIPs the directory
    // ONCE (asset hash dedup), then references the same staged asset
    // across every deployment. Without reuse, each deployment re-stages
    // the directory — a 100 MB `dist/` × 7 deployments = 700 MB of
    // transient asset uploads + Lambda asset hashes on every cdk synth.
    const immutablePaths = manifest.staticAssets.immutablePaths;
    const noCachePaths = manifest.staticAssets.noCachePaths;
    const mutableCacheControl =
      manifest.staticAssets.cacheControl ??
      'public, s-maxage=31536000, max-age=0, must-revalidate';
    const htmlCacheControl = 'no-cache, no-store, must-revalidate';
    const htmlGlobs = ['*.html', '**/*.html'];
    const staticSource = Source.asset(manifest.staticAssets.directory);
    // Track the asset deployments so the per-extension font Content-
    // Type deployments can declare an explicit `addDependency` —
    // without this, CDK is free to reorder them and a font deployment
    // that runs BEFORE the matching asset deployment is silently
    // overwritten with `binary/octet-stream` from the next pass. We
    // observed this on a live deploy where the font deployment ran 1
    // minute before the asset deployment that overwrote it.
    const assetDeployments: BucketDeployment[] = [];

    // Deploy no-cache paths (e.g. config.json) — always revalidate.
    if (noCachePaths && noCachePaths.length > 0) {
      assetDeployments.push(
        new BucketDeployment(this, 'AssetDeploymentNoCache', {
          sources: [staticSource],
          destinationBucket: this.bucket,
          destinationKeyPrefix: `builds/${buildId}/`,
          exclude: ['*'],
          include: noCachePaths,
          cacheControl: [CacheControl.fromString(htmlCacheControl)],
          prune: false,
        }),
      );
    }

    if (immutablePaths && immutablePaths.length > 0) {
      assetDeployments.push(
        new BucketDeployment(this, 'AssetDeploymentImmutable', {
          sources: [staticSource],
          destinationBucket: this.bucket,
          destinationKeyPrefix: `builds/${buildId}/`,
          exclude: ['*'],
          include: immutablePaths,
          cacheControl: [
            CacheControl.fromString('public, max-age=31536000, immutable'),
          ],
          prune: false,
          distribution: this.distribution,
          distributionPaths: ['/*'],
        }),
      );
      assetDeployments.push(
        new BucketDeployment(this, 'AssetDeploymentHtml', {
          sources: [staticSource],
          destinationBucket: this.bucket,
          destinationKeyPrefix: `builds/${buildId}/`,
          exclude: ['*'],
          include: htmlGlobs,
          cacheControl: [CacheControl.fromString(htmlCacheControl)],
          prune: false,
        }),
      );
      assetDeployments.push(
        new BucketDeployment(this, 'AssetDeploymentMutable', {
          sources: [staticSource],
          destinationBucket: this.bucket,
          destinationKeyPrefix: `builds/${buildId}/`,
          exclude: [...immutablePaths, ...htmlGlobs, ...(noCachePaths ?? [])],
          cacheControl: [CacheControl.fromString(mutableCacheControl)],
          prune: false,
        }),
      );
    } else {
      assetDeployments.push(
        new BucketDeployment(this, 'AssetDeploymentHtml', {
          sources: [staticSource],
          destinationBucket: this.bucket,
          destinationKeyPrefix: `builds/${buildId}/`,
          exclude: ['*'],
          include: htmlGlobs,
          cacheControl: [CacheControl.fromString(htmlCacheControl)],
          prune: false,
          distribution: this.distribution,
          distributionPaths: ['/*'],
        }),
      );
      assetDeployments.push(
        new BucketDeployment(this, 'AssetDeploymentOther', {
          sources: [staticSource],
          destinationBucket: this.bucket,
          destinationKeyPrefix: `builds/${buildId}/`,
          exclude: [...htmlGlobs, ...(noCachePaths ?? [])],
          cacheControl: [CacheControl.fromString(mutableCacheControl)],
          prune: false,
        }),
      );
    }

    // ---- 12b. Font Content-Type pass ----
    // S3's `binary/octet-stream` default for font extensions makes
    // browsers reject fonts under CORS. We re-deploy *only* font
    // files with `contentType` set explicitly so the right MIME wires
    // through to the viewer. One BucketDeployment per extension —
    // each is a CDK custom resource. Failure here would leave fonts
    // with the wrong Content-Type, but the default monitoring
    // construct (P3.1, opt-in) alarms on Lambda errors so silent
    // failures surface in CloudWatch.
    //
    // We reuse the same `staticSource` Source.asset declared above —
    // CDK dedups the staged asset zip across all BucketDeployments
    // via content hash, so the directory is staged exactly once even
    // with N font extensions present.
    //
    // We don't set Cache-Control here — fonts are commonly hashed
    // (Next emits them under `_next/static/media`) AND non-hashed
    // (`public/fonts/`); applying a long-lived Cache-Control here
    // would be wrong for the latter, so we leave it unset and let the
    // prior asset deployments govern.
    const FONT_TYPES: Array<[string, string]> = [
      ['.woff2', 'font/woff2'],
      ['.woff', 'font/woff'],
      ['.ttf', 'font/ttf'],
      ['.otf', 'font/otf'],
      ['.eot', 'application/vnd.ms-fontobject'],
    ];
    const fontExtensionsPresent = detectFontExtensions(
      manifest.staticAssets.directory,
      FONT_TYPES.map(([ext]) => ext),
    );
    for (const [ext, mime] of FONT_TYPES) {
      if (!fontExtensionsPresent.has(ext)) continue;
      const fontDeployment = new BucketDeployment(
        this,
        `FontTypeDeployment${ext.replace('.', '')}`,
        {
          sources: [staticSource],
          destinationBucket: this.bucket,
          destinationKeyPrefix: `builds/${buildId}/`,
          exclude: ['*'],
          include: [`*${ext}`],
          contentType: mime,
          prune: false,
        },
      );
      // Force ordering: the font deployment must run AFTER the asset
      // deployments that ship the same files with the wrong default
      // Content-Type. Without this dependency, CDK is free to schedule
      // the font deployment first; the subsequent asset deployment
      // then re-uploads the font with `binary/octet-stream` and
      // silently undoes the fix.
      for (const dep of assetDeployments) {
        fontDeployment.node.addDependency(dep);
      }
    }
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

/**
 * Walk a directory looking for files matching any of the given
 * extensions. Returns the set of extensions actually present so the
 * caller can skip emitting empty-on-arrival BucketDeployments.
 *
 * Used at synth time only — the directory has already been built before
 * the L3 runs. Errors (missing dir, permission, etc.) silently return
 * an empty set: the worst case is a missing font MIME pass, which is
 * the pre-fix behavior.
 */
/**
 * Coerce a `Duration | number` (seconds) into `Duration | undefined`.
 *
 * Public-API ergonomics: callers consuming the L3 from JS-compiled
 * wrappers (or strict TS users who write `timeout: 30`) often pass a
 * plain number. Without this coercion the value flows into
 * aws-cdk-lib's Lambda construct and crashes synth deep in framework
 * code with `props.timeout.toSeconds is not a function` — surfaced
 * by the AWS Blocks bug-bash repro (`@aws-blocks/blocks` Hosting
 * wrapper passing `timeout: 30` straight through). Normalize once
 * here so both shapes work and the type stays well-defined inside
 * the L3.
 */
const normalizeTimeout = (t?: Duration | number): Duration | undefined => {
  if (t === undefined) return undefined;
  if (typeof t === 'number') return Duration.seconds(t);
  return t;
};

const detectFontExtensions = (
  rootDir: string,
  extensions: readonly string[],
): Set<string> => {
  const found = new Set<string>();
  const exts = new Set(extensions.map((e) => e.toLowerCase()));
  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (exts.has(ext)) found.add(ext);
        if (found.size === exts.size) return;
      }
    }
  };
  walk(rootDir);
  return found;
};
