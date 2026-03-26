import { Construct } from 'constructs';
import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  Distribution,
  ViewerProtocolPolicy,
  CachePolicy,
  OriginRequestPolicy,
  AllowedMethods,
  HttpVersion,
  PriceClass,
  Function as CloudFrontFunction,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  CachedMethods,
  BehaviorOptions,
} from 'aws-cdk-lib/aws-cloudfront';
import {
  S3BucketOrigin,
  FunctionUrlOrigin,
} from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  Bucket,
  BlockPublicAccess,
  BucketEncryption,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import {
  Function as LambdaFunction,
  Runtime,
  Code,
  Architecture,
  FunctionUrlAuthType,
  InvokeMode,
  LayerVersion,
  FunctionUrl,
  CfnPermission,
} from 'aws-cdk-lib/aws-lambda';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
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
import { DeployManifest, ComputeResource } from '../manifest/types.js';
import { HostingResources } from '../types.js';

/**
 * Account ID for the public Lambda Web Adapter layer.
 * Maintained by AWS Labs: https://github.com/awslabs/aws-lambda-web-adapter
 */
const LAMBDA_WEB_ADAPTER_ACCOUNT = '753240598075';

/**
 * Layer name and version for the Lambda Web Adapter (x86-64).
 */
const LAMBDA_WEB_ADAPTER_LAYER_NAME = 'LambdaAdapterLayerX86-64';
const LAMBDA_WEB_ADAPTER_LAYER_VERSION = '22';

/**
 * Domain configuration for custom domain support.
 */
export interface HostingDomainConfig {
  /**
   * The fully-qualified domain name (e.g., 'www.example.com' or 'example.com').
   */
  domainName: string;

  /**
   * The Route 53 hosted zone name (e.g., 'example.com').
   */
  hostedZone: string;
}

/**
 * WAF configuration for CloudFront protection.
 */
export interface HostingWafConfig {
  /**
   * Whether WAF is enabled.
   */
  enabled: boolean;
}

export interface AmplifyHostingConstructProps {
  /**
   * The validated deploy manifest.
   */
  manifest: DeployManifest;

  /**
   * Absolute path to the .amplify-hosting/static/ directory.
   */
  staticAssetPath: string;

  /**
   * Absolute path to the .amplify-hosting/compute/ directory.
   * Required when the manifest has compute routes (SSR).
   */
  computeBasePath?: string;

  /**
   * Custom domain configuration.
   * When provided, creates ACM certificate (us-east-1), Route 53 A record,
   * and configures CloudFront alternate domain name.
   */
  domain?: HostingDomainConfig;

  /**
   * WAF configuration.
   * When enabled, creates a WAFv2 WebACL with AWS managed rule groups
   * and associates it with the CloudFront distribution.
   */
  waf?: HostingWafConfig;

  /**
   * Optional friendly name.
   */
  name?: string;
}

/**
 * Generate CloudFront Function code that prepends the build ID prefix to request URIs.
 * This enables atomic deploys — all assets are stored under `builds/{buildId}/`.
 */
export const generateBuildIdFunctionCode = (buildId: string): string => {
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
  return Date.now().toString(36);
};

/**
 * Unified, manifest-driven hosting construct.
 *
 * Always creates: S3 bucket (private, BLOCK_ALL), CloudFront distribution,
 * OAC, atomic deployment with Build ID.
 *
 * Conditional features based on props:
 * - Compute routes in manifest → Lambda + Function URL + split CloudFront behaviors
 * - domain config → ACM certificate (us-east-1) + Route 53 A record + CF aliases
 * - waf.enabled → WAFv2 WebACL with managed rule groups
 *
 * The construct never knows which framework produced the manifest — adapters
 * are just plugins that emit different manifests.
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

    // ---- S3 Bucket (always created — private, OAC-secured) ----
    this.bucket = new Bucket(this, 'HostingBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ---- CloudFront Function for Build ID rewriting (atomic deploys) ----
    const buildIdFunction = new CloudFrontFunction(
      this,
      'BuildIdRewriteFunction',
      {
        code: FunctionCode.fromInline(generateBuildIdFunctionCode(buildId)),
        runtime: FunctionRuntime.JS_2_0,
        comment: `Rewrites request URIs to include build ID prefix: builds/${buildId}/`,
      },
    );

    // ---- S3 origin with OAC (always created) ----
    const s3Origin = S3BucketOrigin.withOriginAccessControl(this.bucket);

    // ---- Check whether manifest has compute routes ----
    const computeRoutes = manifest.routes.filter(
      (r) => r.target.kind === 'Compute',
    );
    const hasCompute =
      computeRoutes.length > 0 &&
      (manifest.computeResources?.length ?? 0) > 0;

    // ---- Conditionally create Lambda + Function URL for SSR ----
    let lambdaOrigin:
      | ReturnType<typeof FunctionUrlOrigin.withOriginAccessControl>
      | undefined;

    if (hasCompute) {
      const computeResource =
        manifest.computeResources![0] as ComputeResource;
      const computeDir = `${props.computeBasePath!}/${computeResource.name}`;

      const webAdapterLayerArn = `arn:aws:lambda:${region}:${LAMBDA_WEB_ADAPTER_ACCOUNT}:layer:${LAMBDA_WEB_ADAPTER_LAYER_NAME}:${LAMBDA_WEB_ADAPTER_LAYER_VERSION}`;

      const ssrFn = new LambdaFunction(this, 'SsrFunction', {
        runtime: Runtime.NODEJS_20_X,
        handler: computeResource.entrypoint,
        code: Code.fromAsset(computeDir),
        architecture: Architecture.X86_64,
        memorySize: 512,
        timeout: Duration.seconds(30),
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
          PORT: '3000',
        },
      });

      const fnUrl = ssrFn.addFunctionUrl({
        authType: FunctionUrlAuthType.AWS_IAM,
        invokeMode: InvokeMode.RESPONSE_STREAM,
      });

      this.ssrFunction = ssrFn;
      this.functionUrl = fnUrl;

      lambdaOrigin = FunctionUrlOrigin.withOriginAccessControl(fnUrl);
    }

    // ---- Custom Domain: ACM Certificate (us-east-1) ----
    if (props.domain) {
      const zone = HostedZone.fromLookup(this, 'HostedZone', {
        domainName: props.domain.hostedZone,
      });
      this.hostedZone = zone;

      // DnsValidatedCertificate handles cross-region automatically —
      // creates the certificate in us-east-1 (required for CloudFront)
      // with DNS validation records in the hosted zone.
      this.certificate = new DnsValidatedCertificate(this, 'Certificate', {
        domainName: props.domain.domainName,
        subjectAlternativeNames: [props.domain.domainName],
        hostedZone: zone,
        region: 'us-east-1',
      });
    }

    // ---- WAF: WebACL with AWS Managed Rule Groups ----
    if (props.waf?.enabled) {
      // WAFv2 WebACL for CloudFront must use scope CLOUDFRONT.
      // When the stack is not in us-east-1, CloudFormation automatically
      // handles CLOUDFRONT-scoped WAF ACLs as global resources.
      this.webAcl = new CfnWebACL(this, 'WebAcl', {
        defaultAction: { allow: {} },
        scope: 'CLOUDFRONT',
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: `${props.name ?? 'amplifyHosting'}WebAcl`,
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
        ],
      });
    }

    // ---- Build CloudFront behaviors from manifest routes ----
    const additionalBehaviors: Record<string, BehaviorOptions> = {};

    const makeStaticBehavior = (): BehaviorOptions => ({
      origin: s3Origin,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
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
      originRequestPolicy:
        OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    });

    // Process non-catch-all routes into additionalBehaviors
    for (const route of manifest.routes) {
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
    const catchAllRoute = manifest.routes.find((r) => r.path === '/*');
    const defaultIsCompute =
      catchAllRoute?.target.kind === 'Compute' && hasCompute;

    const defaultBehavior = defaultIsCompute
      ? makeComputeBehavior()
      : makeStaticBehavior();

    // ---- CloudFront Distribution ----
    const isSpaOnly = !hasCompute;

    this.distribution = new Distribution(this, 'HostingDistribution', {
      defaultBehavior,
      additionalBehaviors:
        Object.keys(additionalBehaviors).length > 0
          ? additionalBehaviors
          : undefined,
      defaultRootObject: isSpaOnly ? 'index.html' : undefined,
      httpVersion: HttpVersion.HTTP2_AND_3,
      priceClass: PriceClass.PRICE_CLASS_100,
      // Custom domain: alternate domain names + certificate
      ...(this.certificate && props.domain
        ? {
            domainNames: [props.domain.domainName],
            certificate: this.certificate,
          }
        : {}),
      // WAF association
      ...(this.webAcl ? { webAclId: this.webAcl.attrArn } : {}),
      // SPA error handling: 403/404 → index.html (only for SPA/static)
      ...(isSpaOnly
        ? {
            errorResponses: [
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
            ],
          }
        : {}),
    });

    // ---- Route 53 A Record (only when custom domain configured) ----
    if (props.domain && this.hostedZone) {
      new ARecord(this, 'DnsRecord', {
        zone: this.hostedZone,
        recordName: props.domain.domainName,
        target: RecordTarget.fromAlias(
          new CloudFrontTarget(this.distribution),
        ),
      });
    }

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

    // ---- Atomic Deployment (always created — uploads static assets) ----
    new BucketDeployment(this, 'AssetDeployment', {
      sources: [Source.asset(props.staticAssetPath)],
      destinationBucket: this.bucket,
      destinationKeyPrefix: `builds/${buildId}/`,
      prune: false,
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
}
