import { Construct } from 'constructs';
import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
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
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { CfnPermission, IFunction, IFunctionUrl } from 'aws-cdk-lib/aws-lambda';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { HostingError } from '../hosting_error.js';
import { DeployManifest } from '../manifest/types.js';
import { ERROR_PAGE_KEY, generateBuildIdFunctionCode } from '../defaults.js';

// ---- Constants ----

/**
 * CloudFront allows a maximum of 25 cache behaviors per distribution
 * (1 default + 24 additional). Exceeding this causes a deploy-time error.
 */
const MAX_ADDITIONAL_BEHAVIORS = 24;

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
 * Props for the CdnConstruct.
 */
export type CdnConstructProps = {
  /** S3 origin bucket for static assets. */
  bucket: IBucket;
  /** Deploy manifest containing routes, buildId, and framework metadata. */
  manifest: DeployManifest;
  /** CloudFront ResponseHeadersPolicy for security headers. */
  securityHeadersPolicy: ResponseHeadersPolicy;
  /** Lambda Function URL for SSR origin (SSR only). */
  ssrFunctionUrl?: IFunctionUrl;
  /** Lambda function reference for OAC permission patching (SSR only). */
  ssrFunction?: IFunction;
  /** WAFv2 WebACL to associate with the distribution. */
  webAcl?: CfnWebACL;
  /** ACM certificate for custom domain TLS. */
  certificate?: ICertificate;
  /** Custom domain name for CloudFront aliases. */
  domainName?: string;
  /** S3 bucket for CloudFront access logging. */
  accessLogBucket?: IBucket;
  /** CloudFront price class. Default: PRICE_CLASS_100 (US, Canada, Europe). */
  priceClass?: PriceClass;
  /** Custom error page HTML for SSR 5xx responses. Default: built-in SSR_ERROR_PAGE_HTML. */
  errorPageHtml?: string;
};

// ---- Construct ----

/**
 * CloudFront distribution with all cache behaviors, error responses,
 * OAC permission patches, and the Build ID rewrite function.
 *
 * Handles:
 * - Build ID CloudFront Function creation
 * - Static and compute behavior construction
 * - Route processing into additional behaviors
 * - Default behavior determination (catch-all route)
 * - SPA 403/404 error responses and SSR 502/503/504 error pages
 * - Distribution creation with WAF, custom domain, access logging
 * - OAC permission patch (S3 bucket policy + Lambda invoke permission)
 */
export class CdnConstruct extends Construct {
  readonly distribution: Distribution;
  readonly distributionUrl: string;

  /**
   * The error page HTML used for SSR 5xx responses.
   * Exposed so the orchestrator can deploy it to S3.
   */
  readonly errorPageHtml: string;

  /**
   * Create a CloudFront distribution with the given props.
   */
  constructor(scope: Construct, id: string, props: CdnConstructProps) {
    super(scope, id);

    const { manifest, bucket } = props;

    if (!manifest.buildId) {
      throw new HostingError('MissingBuildIdError', {
        message: 'Deploy manifest must include a buildId.',
        resolution:
          'Ensure your adapter generates a buildId in the deploy manifest.',
      });
    }

    const buildId = manifest.buildId;
    const account = Stack.of(this).account;
    const hasCompute = !!props.ssrFunctionUrl;
    this.errorPageHtml = props.errorPageHtml ?? SSR_ERROR_PAGE_HTML;

    // ---- Build ID rewrite function ----
    const buildIdFunction = new CloudFrontFunction(
      this,
      'BuildIdRewriteFunction',
      {
        code: FunctionCode.fromInline(generateBuildIdFunctionCode(buildId)),
        runtime: FunctionRuntime.JS_2_0,
        comment: `Rewrites request URIs to include build ID prefix: builds/${buildId}/`,
      },
    );

    // ---- Origins ----
    const s3Origin = S3BucketOrigin.withOriginAccessControl(bucket);

    const lambdaOrigin = props.ssrFunctionUrl
      ? FunctionUrlOrigin.withOriginAccessControl(props.ssrFunctionUrl)
      : undefined;

    // ---- Behavior helpers ----
    const makeStaticBehavior = (): BehaviorOptions => ({
      origin: s3Origin,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      compress: true,
      responseHeadersPolicy: props.securityHeadersPolicy,
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
      responseHeadersPolicy: props.securityHeadersPolicy,
    });

    // ---- Route → behavior mapping ----
    const additionalBehaviors: Record<string, BehaviorOptions> = {};

    // Validate CloudFront behavior limit (max 25 = 1 default + 24 additional)
    const nonCatchAllRoutes = manifest.routes.filter((r) => r.path !== '/*');
    if (nonCatchAllRoutes.length > MAX_ADDITIONAL_BEHAVIORS) {
      throw new HostingError('TooManyRoutesError', {
        message: `The manifest declares ${nonCatchAllRoutes.length} routes (excluding catch-all), but CloudFront supports a maximum of ${MAX_ADDITIONAL_BEHAVIORS} additional cache behaviors.`,
        resolution:
          'Reduce the number of routes in your deploy manifest. Consider consolidating routes with similar patterns, or use a catch-all compute route for dynamic paths.',
      });
    }

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

    // ---- Default behavior (from catch-all route) ----
    const catchAllRoute = manifest.routes.find((r) => r.path === '/*');
    const defaultIsCompute =
      catchAllRoute?.target.kind === 'Compute' && hasCompute;

    const defaultBehavior = defaultIsCompute
      ? makeComputeBehavior()
      : makeStaticBehavior();

    // ---- Error responses ----
    const isSpaOnly = !hasCompute;

    // Error response page paths go directly to S3 (bypass CloudFront Functions),
    // so they must include the full /builds/{buildId}/ prefix.
    const errorResponses: ErrorResponse[] = [
      // SPA error handling: 403/404 → index.html (only for SPA/static)
      ...(isSpaOnly
        ? [
            {
              httpStatus: 403,
              responseHttpStatus: 200,
              responsePagePath: `/builds/${buildId}/index.html`,
              ttl: Duration.seconds(0),
            },
            {
              httpStatus: 404,
              responseHttpStatus: 200,
              responsePagePath: `/builds/${buildId}/index.html`,
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
              responsePagePath: `/builds/${buildId}/${ERROR_PAGE_KEY}`,
              ttl: Duration.seconds(10),
            },
            {
              httpStatus: 503,
              responseHttpStatus: 503,
              responsePagePath: `/builds/${buildId}/${ERROR_PAGE_KEY}`,
              ttl: Duration.seconds(10),
            },
            {
              httpStatus: 504,
              responseHttpStatus: 504,
              responsePagePath: `/builds/${buildId}/${ERROR_PAGE_KEY}`,
              ttl: Duration.seconds(10),
            },
          ]
        : []),
    ];

    // ---- Distribution ----
    this.distribution = new Distribution(this, 'HostingDistribution', {
      defaultBehavior,
      additionalBehaviors:
        Object.keys(additionalBehaviors).length > 0
          ? additionalBehaviors
          : undefined,
      // defaultRootObject is NOT used because the CloudFront Function handles
      // URI rewriting (including '/' → '/index.html') before the origin request.
      // Using both would cause double translation.
      httpVersion: HttpVersion.HTTP2_AND_3,
      priceClass: props.priceClass ?? PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      // Custom domain: alternate domain names + certificate
      ...(props.certificate && props.domainName
        ? {
            domainNames: [props.domainName],
            certificate: props.certificate,
          }
        : {}),
      // WAF association
      ...(props.webAcl ? { webAclId: props.webAcl.attrArn } : {}),
      // Access logging
      ...(props.accessLogBucket
        ? { enableLogging: true, logBucket: props.accessLogBucket }
        : {}),
      // Error responses
      errorResponses: errorResponses.length > 0 ? errorResponses : undefined,
    });

    // ---- OAC: S3 bucket policy for CloudFront read access ----
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [bucket.arnForObjects('*')],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${account}:distribution/${this.distribution.distributionId}`,
          },
        },
      }),
    );

    // ---- OAC: Lambda Function URL permission patch ----
    //
    // CDK's FunctionUrlOrigin.withOriginAccessControl() auto-generates a
    // CfnPermission for lambda:InvokeFunctionUrl, but sets FunctionName to the
    // Function URL resource instead of the Lambda function ARN (CDK bug).
    // We patch FunctionName so CloudFront can invoke the function via its URL.
    // See: https://github.com/aws/aws-cdk/issues/21771
    if (hasCompute && props.ssrFunction) {
      let permissionPatched = false;
      for (const child of this.distribution.node.findAll()) {
        if (
          child instanceof CfnPermission &&
          child.action === 'lambda:InvokeFunctionUrl'
        ) {
          child.addPropertyOverride(
            'FunctionName',
            props.ssrFunction.functionArn,
          );
          permissionPatched = true;
        }
      }

      // Fallback: if CDK changes its internal structure and we can't find the
      // auto-generated permission, create an explicit one instead of failing.
      if (!permissionPatched) {
        new CfnPermission(this, 'CloudFrontLambdaUrlPermission', {
          action: 'lambda:InvokeFunctionUrl',
          principal: 'cloudfront.amazonaws.com',
          functionName: props.ssrFunction.functionArn,
          functionUrlAuthType: 'AWS_IAM',
          sourceArn: `arn:aws:cloudfront::${account}:distribution/${this.distribution.distributionId}`,
        });
      }

      // Separate permission for lambda:InvokeFunction (not InvokeFunctionUrl).
      // OAC requires both actions: InvokeFunctionUrl for streaming via the URL,
      // and InvokeFunction for the CloudFront → Lambda direct invocation path.
      props.ssrFunction.addPermission('CloudFrontOACInvokeFunction', {
        principal: new iam.ServicePrincipal('cloudfront.amazonaws.com'),
        action: 'lambda:InvokeFunction',
        sourceArn: `arn:aws:cloudfront::${account}:distribution/${this.distribution.distributionId}`,
      });
    }

    // ---- Distribution URL ----
    this.distributionUrl = props.domainName
      ? `https://${props.domainName}`
      : `https://${this.distribution.distributionDomainName}`;

    // ---- Outputs ----
    new CfnOutput(this, 'DistributionUrl', {
      value: this.distributionUrl,
      description: 'URL for the hosted site',
    });

    if (props.domainName) {
      new CfnOutput(this, 'CustomDomain', {
        value: props.domainName,
        description: 'Custom domain name for the hosted site',
      });
    }
  }
}
