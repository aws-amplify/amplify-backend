import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
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
import { HostingError } from '../hosting_error.js';
import { ComputeResource, DeployManifest } from '../manifest/types.js';
import { HostingResources } from '../types.js';
import { ERROR_PAGE_KEY, generateBuildId } from '../defaults.js';
import { StorageConstruct } from './storage_construct.js';
import { ComputeConstruct } from './compute_construct.js';
import { WafConstruct } from './waf_construct.js';
import { DnsConstruct } from './dns_construct.js';
import { createSecurityHeadersPolicy } from './security_headers.js';
import { CdnConstruct } from './cdn_construct.js';

// Re-export build ID helpers for backward compatibility (public API + tests)
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
 */
export type AmplifyHostingConstructProps = {
  /** Deploy manifest produced by the framework adapter. */
  manifest: DeployManifest;
  /** Filesystem path to the static assets directory. */
  staticAssetPath: string;
  /** Filesystem path to the compute resource directory (SSR only). */
  computeBasePath?: string;
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
  /** Compute (Lambda) configuration for SSR frameworks. */
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
 * Conditional features based on props:
 * - Compute routes in manifest → Lambda + Function URL + split CloudFront behaviors
 * - domain config → ACM certificate (us-east-1) + Route 53 A record + CF aliases
 * - waf.enabled → WAFv2 WebACL with managed rule groups + rate limiting
 */
export class AmplifyHostingConstruct extends Construct {
  readonly bucket: Bucket;
  readonly distribution: Distribution;
  readonly distributionUrl: string;
  readonly ssrFunction?: LambdaFunction;
  readonly functionUrl?: FunctionUrl;
  readonly certificate?: ICertificate;
  readonly hostedZone?: IHostedZone;
  readonly webAcl?: CfnWebACL;

  /**
   * Create a new manifest-driven hosting construct with the given props.
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

    // ---- 2. Compute resources (conditional) ----
    const computeRoutes = manifest.routes.filter(
      (r) => r.target.kind === 'Compute',
    );
    const hasCompute =
      computeRoutes.length > 0 && (manifest.computeResources?.length ?? 0) > 0;

    if (hasCompute) {
      // hasCompute guarantees computeResources is non-empty, but TypeScript
      // can't narrow through the boolean variable — assert for the compiler.
      const computeResources = manifest.computeResources!;

      if (computeResources.length > 1) {
        throw new HostingError('UnsupportedMultiComputeError', {
          message: `The manifest declares ${computeResources.length} compute resources, but only single-compute manifests are supported.`,
          resolution:
            'Consolidate your server-side logic into a single compute resource. Multi-compute support is not yet available.',
        });
      }
      if (!props.computeBasePath) {
        throw new HostingError('MissingComputeBasePathError', {
          message: 'computeBasePath is required for SSR deployments.',
          resolution: 'This is an internal error. Please report it.',
        });
      }

      const computeResource = computeResources[0] as ComputeResource;
      const compute = props.compute ?? {};

      const computeConstruct = new ComputeConstruct(this, 'Compute', {
        computeResource,
        computeBasePath: props.computeBasePath,
        memorySize: compute.memorySize,
        timeout: compute.timeout,
        reservedConcurrency: compute.reservedConcurrency,
        logRetention: compute.logRetention,
        skipRegionValidation: props.skipRegionValidation,
      });

      this.ssrFunction = computeConstruct.function;
      this.functionUrl = computeConstruct.functionUrl;
    }

    // ---- 3. WAF (conditional) ----
    const wafConstruct = new WafConstruct(this, 'Waf', {
      enabled: props.waf?.enabled ?? false,
      rateLimit: props.waf?.rateLimit,
      skipRegionValidation: props.skipRegionValidation,
    });
    this.webAcl = wafConstruct.webAcl;

    // ---- 4. Custom domain resources (conditional) ----
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

    // ---- 5. Security headers ----
    const securityHeadersPolicy = createSecurityHeadersPolicy(
      this,
      'SecurityHeaders',
      { contentSecurityPolicy: props.cdn?.contentSecurityPolicy },
    );

    // ---- 6. CloudFront distribution (CDN + OAC patches) ----
    // Stamp the buildId into the manifest so CdnConstruct can read it
    const manifestWithBuildId: DeployManifest = { ...manifest, buildId };

    const cdn = new CdnConstruct(this, 'Cdn', {
      bucket: this.bucket,
      manifest: manifestWithBuildId,
      securityHeadersPolicy,
      ssrFunctionUrl: this.functionUrl,
      ssrFunction: this.ssrFunction,
      webAcl: this.webAcl,
      certificate: this.certificate,
      domainName: props.domain?.domainName,
      accessLogBucket: storage.accessLogBucket,
      priceClass: props.cdn?.priceClass,
      geoRestriction: props.cdn?.geoRestriction,
    });

    this.distribution = cdn.distribution;
    this.distributionUrl = cdn.distributionUrl;

    // ---- 6a. KMS decrypt grant for CloudFront OAC ----
    // When the hosting bucket uses KMS encryption, CloudFront OAC needs
    // kms:Decrypt to read objects via SigV4. Grant on BYO key or CDK auto-key.
    // NOTE: We scope the grant to the CloudFront service principal but omit a
    // SourceArn condition referencing the distribution. Adding a Ref to the
    // distribution here would create a Key→Distribution→Bucket→Key circular
    // dependency in CloudFormation.
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

    // ---- 7. DNS records (only when custom domain configured) ----
    if (props.domain && dnsConstruct) {
      dnsConstruct.createDnsRecords(this.distribution);
    }

    // ---- 8. Upload SSR error page for 5xx responses ----
    if (hasCompute) {
      new BucketDeployment(this, 'ErrorPageDeployment', {
        sources: [Source.data(ERROR_PAGE_KEY, cdn.errorPageHtml)],
        destinationBucket: this.bucket,
        destinationKeyPrefix: `builds/${buildId}/`,
        prune: false,
      });
    }

    // ---- 9. Atomic Deployment (uploads static assets + invalidates CloudFront) ----
    new BucketDeployment(this, 'AssetDeployment', {
      sources: [Source.asset(props.staticAssetPath)],
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
