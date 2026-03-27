import { Construct } from 'constructs';
import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as nodeFs from 'fs';
import * as nodePath from 'path';
import * as nodeOs from 'os';
import {
  AllowedMethods,
  BehaviorOptions,
  CachePolicy,
  CachedMethods,
  Function as CloudFrontFunction,
  Distribution,
  ErrorResponse,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  HttpVersion,
  OriginRequestPolicy,
  PriceClass,
  ResponseHeadersPolicy,
  SecurityPolicyProtocol,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import {
  FunctionUrlOrigin,
  S3BucketOrigin,
} from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import {
  Architecture,
  CfnPermission,
  Code,
  FunctionUrl,
  FunctionUrlAuthType,
  InvokeMode,
  Function as LambdaFunction,
  LayerVersion,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
  DnsValidatedCertificate,
  ICertificate,
} from 'aws-cdk-lib/aws-certificatemanager';
import {
  ARecord,
  HostedZone,
  IHostedZone,
  RecordTarget,
} from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { ComputeResource, DeployManifest } from '../manifest/types.js';
import { ComputeConfig, HostingResources } from '../types.js';
import { BUILD_ID_PATTERN, SSR_DEFAULT_PORT } from '../defaults.js';

// ---- Constants ----

/**
 * Account ID for the public Lambda Web Adapter layer.
 * Maintained by AWS Labs: https://github.com/awslabs/aws-lambda-web-adapter
 */
const LAMBDA_WEB_ADAPTER_ACCOUNT = '753240598075';

/**
 * Layer name for the Lambda Web Adapter (x86-64).
 */
const LAMBDA_WEB_ADAPTER_LAYER_NAME = 'LambdaAdapterLayerX86';

/**
 * Lambda Web Adapter layer version. Update this when upgrading Lambda Web Adapter.
 */
const LAMBDA_WEB_ADAPTER_VERSION = 22;

/** Default Lambda memory in MB */
const DEFAULT_LAMBDA_MEMORY_MB = 512;

/** Default Lambda timeout in seconds */
const DEFAULT_LAMBDA_TIMEOUT_SECONDS = 30;

/**
 * Regions known to host the Lambda Web Adapter public layer.
 * Source: https://github.com/awslabs/aws-lambda-web-adapter
 * This list may need updating as new regions are added.
 */
const LAMBDA_WEB_ADAPTER_SUPPORTED_REGIONS = new Set([
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-north-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-south-1',
  'sa-east-1',
  'ca-central-1',
  'me-south-1',
  'af-south-1',
  'eu-south-1',
]);

/** S3 lifecycle expiration for old builds (days) */
const BUILD_EXPIRATION_DAYS = 90;

/**
 * Generic error page HTML for SSR 5xx errors.
 */
const SSR_ERROR_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Service Temporarily Unavailable</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#374151}
.c{text-align:center;max-width:480px;padding:2rem}h1{font-size:1.5rem;margin-bottom:.5rem}p{color:#6b7280}</style></head>
<body><div class="c"><h1>Service Temporarily Unavailable</h1><p>We're working on it. Please try again in a few moments.</p></div></body></html>`;

// ---- Public types ----

/**
 * Domain configuration for custom domain support.
 */
export type HostingDomainConfig = {
  domainName: string;
  hostedZone: string;
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
  name?: string;
};

// ---- Exported helpers ----

/**
 * Generate CloudFront Function code that prepends the build ID prefix to request URIs.
 * This enables atomic deploys — all assets are stored under `builds/{buildId}/`.
 */
export const generateBuildIdFunctionCode = (buildId: string): string => {
  if (!BUILD_ID_PATTERN.test(buildId)) {
    throw new AmplifyUserError('InvalidBuildIdError', {
      message: `Build ID must be alphanumeric with hyphens, max 64 chars. Got: ${buildId}`,
      resolution:
        'Ensure build ID contains only letters, numbers, and hyphens.',
    });
  }
  return `function handler(event) {
  var request = event.request;
  var uri = request.uri;
  // Prepend build ID prefix for atomic deployment
  request.uri = '/builds/${buildId}' + uri;
  return request;
}`;
};

/**
 * Generate a unique Build ID based on the current timestamp.
 */
export const generateBuildId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
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
    const region = Stack.of(this).region;
    const account = Stack.of(this).account;

    // ---- Core resources ----
    this.bucket = this.createBucket(props);

    const buildIdFunction = new CloudFrontFunction(
      this,
      'BuildIdRewriteFunction',
      {
        code: FunctionCode.fromInline(generateBuildIdFunctionCode(buildId)),
        runtime: FunctionRuntime.JS_2_0,
        comment: `Rewrites request URIs to include build ID prefix: builds/${buildId}/`,
      },
    );

    const s3Origin = S3BucketOrigin.withOriginAccessControl(this.bucket);

    // ---- Compute resources (conditional) ----
    const computeRoutes = manifest.routes.filter(
      (r) => r.target.kind === 'Compute',
    );
    const hasCompute =
      computeRoutes.length > 0 && (manifest.computeResources?.length ?? 0) > 0;

    let lambdaOrigin:
      | ReturnType<typeof FunctionUrlOrigin.withOriginAccessControl>
      | undefined;

    if (hasCompute) {
      const computeResource = manifest.computeResources![0] as ComputeResource;
      const result = this.createSsrFunction(props, computeResource, region);
      (this as { ssrFunction?: LambdaFunction }).ssrFunction = result.ssrFn;
      (this as { functionUrl?: FunctionUrl }).functionUrl = result.fnUrl;
      lambdaOrigin = FunctionUrlOrigin.withOriginAccessControl(result.fnUrl);
    }

    // ---- Custom domain resources (conditional) ----
    if (props.domain) {
      this.validateDomainConfig(props.domain);
      const domainResult = this.createDomainResources(props.domain);
      (this as { certificate?: ICertificate }).certificate =
        domainResult.certificate;
      (this as { hostedZone?: IHostedZone }).hostedZone = domainResult.zone;
    }

    // ---- WAF (conditional) ----
    if (props.waf?.enabled) {
      (this as { webAcl?: CfnWebACL }).webAcl = this.createWafWebAcl(
        props.name,
        props.waf.rateLimit,
      );
    }

    // ---- Access log bucket (conditional) ----
    let logBucket: Bucket | undefined;
    if (props.accessLogging) {
      logBucket = new Bucket(this, 'AccessLogBucket', {
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        encryption: BucketEncryption.S3_MANAGED,
        objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        lifecycleRules: [
          {
            id: 'ExpireAccessLogs',
            expiration: Duration.days(90),
            enabled: true,
          },
        ],
      });
    }

    // ---- Security headers ----
    const securityHeadersPolicy = this.createSecurityHeadersPolicy(
      props.contentSecurityPolicy,
    );

    // ---- CloudFront distribution ----
    this.distribution = this.createDistribution({
      props,
      s3Origin,
      lambdaOrigin,
      buildIdFunction,
      securityHeadersPolicy,
      hasCompute,
      logBucket,
    });

    // ---- Route 53 A Record (only when custom domain configured) ----
    if (props.domain && this.hostedZone) {
      new ARecord(this, 'DnsRecord', {
        zone: this.hostedZone,
        recordName: props.domain.domainName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
      });
    }

    // ---- S3 Bucket Policy for OAC (CloudFront read access) ----
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [this.bucket.arnForObjects('*')],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${account}:distribution/${this.distribution.distributionId}`,
          },
        },
      }),
    );

    // ---- Fix CloudFront OAC permissions for Lambda Function URL ----
    if (hasCompute && this.ssrFunction) {
      for (const child of this.distribution.node.findAll()) {
        if (
          child instanceof CfnPermission &&
          child.action === 'lambda:InvokeFunctionUrl'
        ) {
          child.addPropertyOverride(
            'FunctionName',
            this.ssrFunction.functionArn,
          );
        }
      }

      this.ssrFunction.addPermission('CloudFrontOACInvokeFunction', {
        principal: new ServicePrincipal('cloudfront.amazonaws.com'),
        action: 'lambda:InvokeFunction',
        sourceArn: `arn:aws:cloudfront::${account}:distribution/${this.distribution.distributionId}`,
      });
    }

    // ---- Upload SSR error page for 5xx responses ----
    if (hasCompute) {
      const errorPageDir = this.createErrorPage();
      new BucketDeployment(this, 'ErrorPageDeployment', {
        sources: [Source.asset(errorPageDir)],
        destinationBucket: this.bucket,
        destinationKeyPrefix: `builds/${buildId}/`,
        prune: false,
      });
    }

    // ---- Atomic Deployment (uploads static assets + invalidates CloudFront) ----
    new BucketDeployment(this, 'AssetDeployment', {
      sources: [Source.asset(props.staticAssetPath)],
      destinationBucket: this.bucket,
      destinationKeyPrefix: `builds/${buildId}/`,
      prune: false,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });

    // ---- Determine the primary URL ----
    this.distributionUrl = props.domain
      ? `https://${props.domain.domainName}`
      : `https://${this.distribution.distributionDomainName}`;

    // ---- Outputs ----
    new CfnOutput(this, 'DistributionUrl', {
      value: this.distributionUrl,
      description: 'URL for the hosted site',
    });

    if (props.domain) {
      new CfnOutput(this, 'CustomDomain', {
        value: props.domain.domainName,
        description: 'Custom domain name for the hosted site',
      });
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

  // ---- Private methods ----

  /**
   * Create the S3 bucket with lifecycle rules and appropriate removal policy.
   */
  private createBucket(props: AmplifyHostingConstructProps): Bucket {
    const retainOnDelete = props.retainOnDelete ?? false;
    return new Bucket(this, 'HostingBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      versioned: true,
      removalPolicy: retainOnDelete
        ? RemovalPolicy.RETAIN
        : RemovalPolicy.DESTROY,
      autoDeleteObjects: !retainOnDelete,
      lifecycleRules: [
        {
          id: 'DeleteOldBuilds',
          prefix: 'builds/',
          expiration: Duration.days(BUILD_EXPIRATION_DAYS),
          enabled: true,
        },
        {
          id: 'ExpireNoncurrentVersions',
          noncurrentVersionExpiration: Duration.days(30),
          enabled: true,
        },
      ],
    });
  }

  /**
   * Create the SSR Lambda function, Function URL, and least-privilege IAM role.
   */
  private createSsrFunction(
    props: AmplifyHostingConstructProps,
    computeResource: ComputeResource,
    region: string,
  ): { ssrFn: LambdaFunction; fnUrl: FunctionUrl } {
    const computeDir = `${props.computeBasePath!}/${computeResource.name}`;
    const compute = props.compute ?? {};

    // Validate region supports Lambda Web Adapter (skip if region is an unresolved token)
    if (
      !region.includes('${') &&
      !LAMBDA_WEB_ADAPTER_SUPPORTED_REGIONS.has(region)
    ) {
      throw new AmplifyUserError('UnsupportedRegionError', {
        message: `Lambda Web Adapter layer is not available in region '${region}'.`,
        resolution:
          'SSR hosting requires a supported region. ' +
          'See https://github.com/awslabs/aws-lambda-web-adapter for supported regions.',
      });
    }

    const webAdapterLayerArn = `arn:aws:lambda:${region}:${LAMBDA_WEB_ADAPTER_ACCOUNT}:layer:${LAMBDA_WEB_ADAPTER_LAYER_NAME}:${LAMBDA_WEB_ADAPTER_VERSION}`;

    // Explicit least-privilege role — only CloudWatch Logs
    const ssrRole = new Role(this, 'SsrFunctionRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
    });

    const ssrFn = new LambdaFunction(this, 'SsrFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler', // Dummy — Lambda Web Adapter intercepts execution
      code: Code.fromAsset(computeDir),
      architecture: Architecture.X86_64,
      memorySize: compute.memorySize ?? DEFAULT_LAMBDA_MEMORY_MB,
      timeout: Duration.seconds(
        compute.timeout ?? DEFAULT_LAMBDA_TIMEOUT_SECONDS,
      ),
      reservedConcurrentExecutions: compute.reservedConcurrency,
      role: ssrRole,
      layers: [
        LayerVersion.fromLayerVersionArn(
          this,
          'WebAdapterLayer',
          webAdapterLayerArn,
        ),
      ],
      environment: {
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        AWS_LWA_INVOKE_MODE: 'response_stream',
        PORT: String(SSR_DEFAULT_PORT),
      },
    });

    const fnUrl = ssrFn.addFunctionUrl({
      authType: FunctionUrlAuthType.AWS_IAM,
      invokeMode: InvokeMode.RESPONSE_STREAM,
    });

    return { ssrFn, fnUrl };
  }

  /**
   * Create WAFv2 WebACL with AWS Managed Rule Groups and rate limiting.
   */
  private createWafWebAcl(name?: string, rateLimit?: number): CfnWebACL {
    if (rateLimit !== undefined && rateLimit < 100) {
      throw new AmplifyUserError('InvalidWafConfigError', {
        message: `WAF rate limit must be at least 100 (got ${rateLimit}). This is an AWS WAFv2 requirement.`,
        resolution:
          'Set waf.rateLimit to 100 or higher, or omit it to use the default (1000).',
      });
    }

    return new CfnWebACL(this, 'WebAcl', {
      defaultAction: { allow: {} },
      scope: 'CLOUDFRONT',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${name ?? 'amplifyHosting'}WebAcl`,
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesCommonRuleSet',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesKnownBadInputsRuleSet',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'RateLimitRule',
          priority: 3,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: rateLimit ?? 1000,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });
  }

  /**
   * Create custom domain resources: ACM certificate and Route 53 hosted zone lookup.
   */
  private createDomainResources(domain: HostingDomainConfig): {
    certificate: ICertificate;
    zone: IHostedZone;
  } {
    const zone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: domain.hostedZone,
    });

    // DnsValidatedCertificate is deprecated since CDK v2.69.0, but the replacement
    // (Certificate + crossRegionReferences: true) requires a two-stack architecture,
    // is still experimental after 3+ years, cannot use HostedZone.fromLookup(), and
    // has its own stack deletion bug (https://github.com/aws/aws-cdk/issues/34813).
    // We'll migrate when crossRegionReferences stabilizes.
    // See also: https://github.com/aws/aws-cdk/issues/30326
    const certificate = new DnsValidatedCertificate(this, 'Certificate', {
      domainName: domain.domainName,
      subjectAlternativeNames: [domain.domainName],
      hostedZone: zone,
      region: 'us-east-1',
    });

    return { certificate, zone };
  }

  /**
   * Validate that the domain name belongs to the hosted zone.
   */
  private validateDomainConfig(domain: HostingDomainConfig): void {
    if (
      !domain.domainName.endsWith(domain.hostedZone) &&
      domain.domainName !== domain.hostedZone
    ) {
      throw new AmplifyUserError('InvalidDomainConfigError', {
        message: `Domain name '${domain.domainName}' is not within hosted zone '${domain.hostedZone}'.`,
        resolution: `Ensure the domain name ends with the hosted zone. For example, if hostedZone is 'example.com', domainName could be 'www.example.com' or 'example.com'.`,
      });
    }
  }

  /**
   * Create the security response headers policy with CSP and HSTS.
   */
  private createSecurityHeadersPolicy(
    customCsp?: string,
  ): ResponseHeadersPolicy {
    const defaultCsp =
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; media-src 'self'; object-src 'none'; frame-ancestors 'self'";

    return new ResponseHeadersPolicy(this, 'SecurityHeaders', {
      securityHeadersBehavior: {
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(730),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: {
          frameOption: HeadersFrameOption.SAMEORIGIN,
          override: true,
        },
        xssProtection: {
          protection: true,
          modeBlock: true,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        contentSecurityPolicy: {
          contentSecurityPolicy: customCsp ?? defaultCsp,
          override: false,
        },
      },
    });
  }

  /**
   * Create the CloudFront distribution with all behaviors.
   */
  private createDistribution(opts: {
    props: AmplifyHostingConstructProps;
    s3Origin: ReturnType<typeof S3BucketOrigin.withOriginAccessControl>;
    lambdaOrigin?: ReturnType<typeof FunctionUrlOrigin.withOriginAccessControl>;
    buildIdFunction: CloudFrontFunction;
    securityHeadersPolicy: ResponseHeadersPolicy;
    hasCompute: boolean;
    logBucket?: Bucket;
  }): Distribution {
    const {
      props,
      s3Origin,
      lambdaOrigin,
      buildIdFunction,
      securityHeadersPolicy,
      hasCompute,
      logBucket,
    } = opts;

    const additionalBehaviors: Record<string, BehaviorOptions> = {};

    const makeStaticBehavior = (): BehaviorOptions => ({
      origin: s3Origin,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      compress: true,
      responseHeadersPolicy: securityHeadersPolicy,
      functionAssociations: [
        {
          function: buildIdFunction,
          eventType: FunctionEventType.VIEWER_REQUEST,
        },
      ],
    });

    const makeComputeBehavior = (): BehaviorOptions => ({
      origin: lambdaOrigin!,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachePolicy: CachePolicy.CACHING_DISABLED,
      compress: true,
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      responseHeadersPolicy: securityHeadersPolicy,
    });

    // Process non-catch-all routes into additionalBehaviors
    for (const route of props.manifest.routes) {
      if (route.path === '/*') {
        continue; // Catch-all becomes defaultBehavior
      }

      if (route.target.kind === 'Compute' && lambdaOrigin) {
        additionalBehaviors[route.path] = makeComputeBehavior();
      } else {
        additionalBehaviors[route.path] = makeStaticBehavior();
      }
    }

    // Determine default behavior from catch-all route
    const catchAllRoute = props.manifest.routes.find((r) => r.path === '/*');
    const defaultIsCompute =
      catchAllRoute?.target.kind === 'Compute' && hasCompute;

    const defaultBehavior = defaultIsCompute
      ? makeComputeBehavior()
      : makeStaticBehavior();

    const isSpaOnly = !hasCompute;

    // Build error responses list once
    const errorResponses: ErrorResponse[] = [
      // SPA error handling: 403/404 → index.html (only for SPA/static)
      ...(isSpaOnly
        ? [
            {
              httpStatus: 403,
              responseHttpStatus: 200,
              responsePagePath: '/index.html',
              ttl: Duration.seconds(0),
            },
            {
              httpStatus: 404,
              responseHttpStatus: 200,
              responsePagePath: '/index.html',
              ttl: Duration.seconds(0),
            },
          ]
        : []),
      // SSR 5xx error pages
      ...(hasCompute
        ? [
            {
              httpStatus: 502,
              responseHttpStatus: 502,
              responsePagePath: '/_error.html',
              ttl: Duration.seconds(10),
            },
            {
              httpStatus: 503,
              responseHttpStatus: 503,
              responsePagePath: '/_error.html',
              ttl: Duration.seconds(10),
            },
            {
              httpStatus: 504,
              responseHttpStatus: 504,
              responsePagePath: '/_error.html',
              ttl: Duration.seconds(10),
            },
          ]
        : []),
    ];

    return new Distribution(this, 'HostingDistribution', {
      defaultBehavior,
      additionalBehaviors:
        Object.keys(additionalBehaviors).length > 0
          ? additionalBehaviors
          : undefined,
      defaultRootObject: isSpaOnly ? 'index.html' : undefined,
      httpVersion: HttpVersion.HTTP2_AND_3,
      priceClass: props.priceClass ?? PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      // Custom domain: alternate domain names + certificate
      ...(this.certificate && props.domain
        ? {
            domainNames: [props.domain.domainName],
            certificate: this.certificate,
          }
        : {}),
      // WAF association
      ...(this.webAcl ? { webAclId: this.webAcl.attrArn } : {}),
      // Access logging
      ...(logBucket ? { enableLogging: true, logBucket } : {}),
      // Error responses
      errorResponses: errorResponses.length > 0 ? errorResponses : undefined,
    });
  }

  /**
   * Create a temporary directory with the SSR error page HTML.
   * Returns the path to a temp directory containing _error.html.
   */
  private createErrorPage(): string {
    const dir = nodeFs.mkdtempSync(
      nodePath.join(nodeOs.tmpdir(), 'hosting-error-page-'),
    );
    nodeFs.writeFileSync(
      nodePath.join(dir, '_error.html'),
      SSR_ERROR_PAGE_HTML,
    );
    return dir;
  }
}
