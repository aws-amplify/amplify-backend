import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { Distribution, PriceClass } from 'aws-cdk-lib/aws-cloudfront';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import {
  FunctionUrl,
  Function as LambdaFunction,
} from 'aws-cdk-lib/aws-lambda';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { HostingError } from '../hosting_error.js';
import { ComputeResource, DeployManifest } from '../manifest/types.js';
import { ComputeConfig, HostingResources } from '../types.js';
import { generateBuildId } from '../defaults.js';
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
  manifest: DeployManifest;
  staticAssetPath: string;
  computeBasePath?: string;
  domain?: HostingDomainConfig;
  waf?: HostingWafConfig;
  compute?: ComputeConfig;
  retainOnDelete?: boolean;
  accessLogging?: boolean;
  /** Custom Content-Security-Policy header value. If not set, a restrictive default is used. */
  contentSecurityPolicy?: string;
  /** CloudFront price class. Default is PRICE_CLASS_100 (US, Canada, Europe). Use PRICE_CLASS_ALL for global distribution. */
  priceClass?: PriceClass;
  /**
   * Skip the Lambda Web Adapter region validation check.
   * Use this escape hatch when deploying to a newly-launched AWS region
   * that supports Lambda Web Adapter but is not yet in the built-in allowlist.
   */
  skipRegionValidation?: boolean;
  name?: string;
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
      retainOnDelete: props.retainOnDelete,
      accessLogging: props.accessLogging,
    });
    this.bucket = storage.bucket;

    // ---- 2. Compute resources (conditional) ----
    const computeRoutes = manifest.routes.filter(
      (r) => r.target.kind === 'Compute',
    );
    const hasCompute =
      computeRoutes.length > 0 && (manifest.computeResources?.length ?? 0) > 0;

    if (hasCompute) {
      if (
        !manifest.computeResources ||
        manifest.computeResources.length === 0
      ) {
        throw new HostingError('MissingComputeResourcesError', {
          message:
            'Manifest has compute routes but no compute resources defined.',
          resolution: 'Add computeResources to the deploy manifest.',
        });
      }
      if (manifest.computeResources.length > 1) {
        throw new HostingError('UnsupportedMultiComputeError', {
          message: `The manifest declares ${manifest.computeResources.length} compute resources, but only single-compute manifests are supported.`,
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

      const computeResource = manifest.computeResources[0] as ComputeResource;
      const compute = props.compute ?? {};

      const computeConstruct = new ComputeConstruct(this, 'Compute', {
        computeResource,
        computeBasePath: props.computeBasePath,
        bucket: this.bucket,
        memorySize: compute.memorySize,
        timeout: compute.timeout
          ? Duration.seconds(compute.timeout)
          : undefined,
        reservedConcurrency: compute.reservedConcurrency,
        skipRegionValidation: props.skipRegionValidation,
      });

      this.ssrFunction = computeConstruct.function;
      this.functionUrl = computeConstruct.functionUrl;
    }

    // ---- 3. WAF (conditional) ----
    const wafConstruct = new WafConstruct(this, 'Waf', {
      enabled: props.waf?.enabled ?? false,
      rateLimit: props.waf?.rateLimit,
      metricName: props.name,
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
      { contentSecurityPolicy: props.contentSecurityPolicy },
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
      priceClass: props.priceClass,
    });

    this.distribution = cdn.distribution;
    this.distributionUrl = cdn.distributionUrl;

    // ---- 7. DNS records (only when custom domain configured) ----
    if (props.domain && dnsConstruct) {
      dnsConstruct.createDnsRecords(props.domain.domainName, this.distribution);
    }

    // ---- 8. Upload SSR error page for 5xx responses ----
    if (hasCompute) {
      new BucketDeployment(this, 'ErrorPageDeployment', {
        sources: [Source.data('_error.html', cdn.errorPageHtml)],
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
