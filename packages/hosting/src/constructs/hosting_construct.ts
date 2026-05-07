import { Construct } from 'constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Distribution, PriceClass } from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import {
  FunctionUrl,
  Function as LambdaFunction,
} from 'aws-cdk-lib/aws-lambda';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { DeployManifest } from '../manifest/types.js';
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
 * - middleware → Lambda@Edge or CloudFront Function
 * - domain config → ACM certificate + Route 53 + CF aliases
 * - waf.enabled → WAFv2 WebACL
 */
export class AmplifyHostingConstruct extends Construct {
  readonly bucket: Bucket;
  readonly distribution: Distribution;
  readonly distributionUrl: string;
  readonly computeFunctions: Map<string, LambdaFunction> = new Map();
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

    // Primary compute (first handler or http-server type)
    let primaryFunction: LambdaFunction | undefined;
    let primaryFunctionUrl: FunctionUrl | undefined;

    for (const [name, resource] of computeEntries) {
      if (resource.type === 'edge') {
        // Edge functions are handled differently (via CloudFront)
        // For now, create as regular Lambda — CloudFront association is in CDN construct
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
        this.computeFunctionUrls.set(name, edgeConstruct.functionUrl);
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
      this.computeFunctionUrls.set(name, computeConstruct.functionUrl);

      if (!primaryFunction) {
        primaryFunction = computeConstruct.function;
        primaryFunctionUrl = computeConstruct.functionUrl;
      }
    }

    // ---- 3. Cache infrastructure (ISR) ----
    if (manifest.cache) {
      // S3 bucket for ISR cache
      this.cacheBucket = new Bucket(this, 'CacheBucket', {
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      });

      // DynamoDB table for tag-based revalidation
      if (manifest.cache.tagRevalidation) {
        this.cacheTable = new Table(this, 'CacheTagTable', {
          partitionKey: { name: 'tag', type: AttributeType.STRING },
          sortKey: { name: 'path', type: AttributeType.STRING },
          billingMode: BillingMode.PAY_PER_REQUEST,
          removalPolicy: RemovalPolicy.DESTROY,
        });
      }

      // SQS queue for async revalidation
      if (manifest.cache.revalidationQueue) {
        this.revalidationQueue = new Queue(this, 'RevalidationQueue', {
          visibilityTimeout: Duration.seconds(30),
          retentionPeriod: Duration.days(1),
        });
      }

      // Grant cache access to the target compute resource
      const cacheComputeName = manifest.cache.computeResource;
      const cacheFunction = this.computeFunctions.get(cacheComputeName);
      if (cacheFunction) {
        this.cacheBucket.grantReadWrite(cacheFunction);
        if (this.cacheTable) {
          this.cacheTable.grantReadWriteData(cacheFunction);
        }
        if (this.revalidationQueue) {
          this.revalidationQueue.grantSendMessages(cacheFunction);
          this.revalidationQueue.grantConsumeMessages(cacheFunction);
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
        skipRegionValidation: props.skipRegionValidation,
      });
      this.computeFunctions.set('image-optimization', imageConstruct.function);
      this.computeFunctionUrls.set(
        'image-optimization',
        imageConstruct.functionUrl,
      );

      if (!primaryFunction) {
        primaryFunction = imageConstruct.function;
        primaryFunctionUrl = imageConstruct.functionUrl;
      }
    }

    // ---- 5. WAF (conditional) ----
    const wafConstruct = new WafConstruct(this, 'Waf', {
      enabled: props.waf?.enabled ?? false,
      rateLimit: props.waf?.rateLimit,
      skipRegionValidation: props.skipRegionValidation,
    });
    this.webAcl = wafConstruct.webAcl;

    // ---- 6. Custom domain resources (conditional) ----
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

    // ---- 7. Security headers ----
    const securityHeadersPolicy = createSecurityHeadersPolicy(
      this,
      'SecurityHeaders',
      { contentSecurityPolicy: props.cdn?.contentSecurityPolicy },
    );

    // ---- 8. CloudFront distribution ----
    const manifestWithBuildId: DeployManifest = { ...manifest, buildId };

    const cdn = new CdnConstruct(this, 'Cdn', {
      bucket: this.bucket,
      manifest: manifestWithBuildId,
      securityHeadersPolicy,
      ssrFunctionUrl: primaryFunctionUrl,
      ssrFunction: primaryFunction,
      webAcl: this.webAcl,
      certificate: this.certificate,
      domainName: props.domain?.domainName,
      accessLogBucket: storage.accessLogBucket,
      priceClass: props.cdn?.priceClass,
      geoRestriction: props.cdn?.geoRestriction,
    });

    this.distribution = cdn.distribution;
    this.distributionUrl = cdn.distributionUrl;

    // ---- 8a. KMS decrypt grant for CloudFront OAC ----
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

    // ---- 9. DNS records ----
    if (props.domain && dnsConstruct) {
      dnsConstruct.createDnsRecords(this.distribution);
    }

    // ---- 10. Error page deployment (SSR only) ----
    if (hasCompute) {
      new BucketDeployment(this, 'ErrorPageDeployment', {
        sources: [Source.data(ERROR_PAGE_KEY, cdn.errorPageHtml)],
        destinationBucket: this.bucket,
        destinationKeyPrefix: `builds/${buildId}/`,
        prune: false,
      });
    }

    // ---- 11. Atomic Deployment (static assets) ----
    new BucketDeployment(this, 'AssetDeployment', {
      sources: [Source.asset(manifest.staticAssets.directory)],
      destinationBucket: this.bucket,
      destinationKeyPrefix: `builds/${buildId}/`,
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
