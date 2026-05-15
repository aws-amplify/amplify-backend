import { Construct } from 'constructs';
import { CfnOutput, Duration, Fn, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  Distribution,
  PriceClass,
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
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
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

// Re-export build ID helpers for public API + tests
export { generateBuildIdFunctionCode, generateBuildId } from '../defaults.js';

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
    timeout?: Duration;
    reservedConcurrency?: number;
    logRetention?: RetentionDays;
  };
  /** CDN (CloudFront) configuration. */
  cdn?: {
    priceClass?: PriceClass;
    contentSecurityPolicy?: string;
    geoRestriction?: {
      type: 'whitelist' | 'blacklist';
      countries: string[];
    };
  };
  /** S3 storage configuration. */
  storage?: {
    encryption?: 'S3_MANAGED' | 'KMS';
    encryptionKey?: IKey;
    retainOnDelete?: boolean;
    buildRetentionDays?: number;
  };
  /** CloudFront access logging configuration. */
  logging?: {
    enabled: boolean;
    retentionDays?: number;
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
  readonly cacheBucket?: Bucket;

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
    const buildId = manifest.buildId ?? generateBuildId();

    // ---- 1. Storage (S3 buckets) ----
    const storage = new StorageConstruct(this, 'Storage', {
      retainOnDelete: props.storage?.retainOnDelete,
      accessLogging: props.logging?.enabled,
      encryption: props.storage?.encryption,
      encryptionKey: props.storage?.encryptionKey,
      buildRetentionDays: props.storage?.buildRetentionDays,
      logRetentionDays: props.logging?.retentionDays,
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
          timeout: props.compute?.timeout,
          reservedConcurrency: props.compute?.reservedConcurrency,
          logRetention: props.compute?.logRetention,
          skipRegionValidation: props.skipRegionValidation,
        });
        this.computeFunctions.set(name, edgeConstruct.function);
        continue;
      }

      const computeConstruct = new ComputeConstruct(this, `Compute-${name}`, {
        name,
        computeResource: resource,
        memorySize: props.compute?.memorySize,
        timeout: props.compute?.timeout,
        reservedConcurrency: props.compute?.reservedConcurrency,
        logRetention: props.compute?.logRetention,
        skipRegionValidation: props.skipRegionValidation,
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
        const revalidationDlq = new Queue(this, 'RevalidationDLQ', {
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
            queue: revalidationDlq,
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
        const revalidationFn = new LambdaFunction(
          this,
          'RevalidationFunction',
          {
            runtime: Runtime.NODEJS_20_X,
            handler: manifest.cache.revalidationFunction.handler,
            code: Code.fromAsset(manifest.cache.revalidationFunction.bundle),
            timeout: Duration.seconds(30),
            memorySize: 256,
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
        skipRegionValidation: props.skipRegionValidation,
      });
      this.computeFunctions.set('middleware', middlewareConstruct.function);
      middlewareEdgeVersion = middlewareConstruct.function.currentVersion;
    }

    // ---- 6. WAF (conditional) ----
    const wafConstruct = new WafConstruct(this, 'Waf', {
      enabled: props.waf?.enabled ?? false,
      rateLimit: props.waf?.rateLimit,
      skipRegionValidation: props.skipRegionValidation,
    });
    this.webAcl = wafConstruct.webAcl;

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
    const securityHeadersPolicy = createSecurityHeadersPolicy(
      this,
      'SecurityHeaders',
      { contentSecurityPolicy: props.cdn?.contentSecurityPolicy },
    );

    // ---- 9. CloudFront distribution ----
    const manifestWithBuildId: DeployManifest = { ...manifest, buildId };

    const cdn = new CdnConstruct(this, 'Cdn', {
      bucket: this.bucket,
      manifest: manifestWithBuildId,
      securityHeadersPolicy,
      computeFunctionUrls: this.computeFunctionUrls,
      computeFunctions: this.computeFunctions,
      middlewareEdgeFunction: middlewareEdgeVersion,
      webAcl: this.webAcl,
      certificate: this.certificate,
      domainName: props.domain?.domainName,
      accessLogBucket: storage.accessLogBucket,
      priceClass: props.cdn?.priceClass,
      geoRestriction: props.cdn?.geoRestriction,
    });

    this.distribution = cdn.distribution;
    this.distributionUrl = cdn.distributionUrl;

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

    // ---- 12. Atomic Deployment (static assets) ----
    new BucketDeployment(this, 'AssetDeployment', {
      sources: [Source.asset(manifest.staticAssets.directory)],
      destinationBucket: this.bucket,
      destinationKeyPrefix: `builds/${buildId}/`,
      cacheControl: [
        CacheControl.fromString('public, max-age=31536000, immutable'),
      ],
      prune: false,
      distribution: this.distribution,
      distributionPaths: ['/*'],
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
