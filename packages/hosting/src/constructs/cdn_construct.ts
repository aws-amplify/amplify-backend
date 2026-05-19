import { Construct } from 'constructs';
import { CfnOutput, Duration, Fn, Stack } from 'aws-cdk-lib';
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
  GeoRestriction,
  HttpVersion,
  IOrigin,
  LambdaEdgeEventType,
  OriginRequestPolicy,
  PriceClass,
  ResponseHeadersPolicy,
  SecurityPolicyProtocol,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import {
  FunctionUrlOrigin,
  HttpOrigin,
  S3BucketOrigin,
} from 'aws-cdk-lib/aws-cloudfront-origins';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import {
  CfnPermission,
  IFunction,
  IFunctionUrl,
  IVersion,
} from 'aws-cdk-lib/aws-lambda';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import {
  EndpointType,
  LambdaIntegration,
  ResponseTransferMode,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { HostingError } from '../hosting_error.js';
import { DeployManifest } from '../manifest/types.js';
import { ERROR_PAGE_KEY, generateBuildIdFunctionCode } from '../defaults.js';

// ---- Constants ----

/**
 * CloudFront allows a maximum of 25 cache behaviors per distribution
 * (1 default + 24 additional).
 */
const MAX_ADDITIONAL_BEHAVIORS = 24;

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
  /** Deploy manifest containing routes, buildId, and compute config. */
  manifest: DeployManifest;
  /** CloudFront ResponseHeadersPolicy for security headers. */
  securityHeadersPolicy: ResponseHeadersPolicy;
  /** Map of compute name → Function URL for per-origin routing. */
  computeFunctionUrls?: Map<string, IFunctionUrl>;
  /** Map of compute name → Lambda function for OAC permission patching. */
  computeFunctions?: Map<string, IFunction>;
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
  /** Geo-restriction configuration. */
  geoRestriction?: {
    type: 'whitelist' | 'blacklist';
    countries: string[];
  };
  /** Custom error page HTML. */
  errorPageHtml?: string;
  /** Lambda@Edge function version for middleware (viewer-request). */
  middlewareEdgeFunction?: IVersion;
};

// ---- Construct ----

/**
 * CloudFront distribution with cache behaviors derived from the DeployManifest.
 *
 * Routes targeting 'static' go to S3.
 * Routes targeting a named compute resource go to the Lambda Function URL origin.
 */
export class CdnConstruct extends Construct {
  readonly distribution: Distribution;
  readonly distributionUrl: string;
  readonly errorPageHtml: string;

  /**
   * Creates the CDN distribution with routes mapped to origins.
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

    if (props.geoRestriction && props.geoRestriction.countries.length === 0) {
      throw new HostingError('EmptyGeoRestrictionError', {
        message: 'geoRestriction.countries array cannot be empty.',
        resolution:
          'Provide at least one ISO 3166-1 alpha-2 country code, or remove the geoRestriction config.',
      });
    }

    const buildId = manifest.buildId;
    const account = Stack.of(this).account;
    const hasComputeRoutes = manifest.routes.some(
      (r) => r.target !== 'static' && r.target !== 's3',
    );
    const hasCompute =
      (props.computeFunctionUrls && props.computeFunctionUrls.size > 0) ||
      hasComputeRoutes;
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

    // SSR Lambda goes through API Gateway REST API + STREAM mode instead of
    // OAC + Function URL. OAC SigV4 includes the body hash; Function URL
    // recomputes it from received bytes and the two diverge, returning 403
    // on every non-empty POST/PUT/PATCH. REST API uses lambda:InvokeFunction
    // (no body re-hash) and is currently the only API GW flavor that
    // supports ResponseTransferMode.STREAM for Lambda proxy integrations.
    //
    // The Lambda must be built with a payload-v1 converter + streaming
    // wrapper (REST API sends v1; most adapters default to v2). Image-opt
    // and other GET-only compute stay on OAC + FURL.
    const computeOrigins = new Map<string, IOrigin>();
    const ssrComputeName: 'default' | 'server' | undefined =
      props.computeFunctions?.has('default')
        ? 'default'
        : props.computeFunctions?.has('server')
          ? 'server'
          : undefined;

    if (ssrComputeName && props.computeFunctions) {
      const ssrFn = props.computeFunctions.get(ssrComputeName)!;
      // REGIONAL: CloudFront is already in front; edge-optimized would
      // double-proxy and cap streaming idle timeout at 30s.
      const restApi = new RestApi(this, 'SsrRestApi', {
        endpointTypes: [EndpointType.REGIONAL],
        deployOptions: { stageName: 'prod' },
      });
      const integration = new LambdaIntegration(ssrFn, {
        proxy: true,
        responseTransferMode: ResponseTransferMode.STREAM,
      });
      // Wire root + {proxy+} manually. CDK's addProxy({ anyMethod: true })
      // attaches a MOCK integration to the root (not our LambdaIntegration),
      // which breaks `/` with "Unable to parse statusCode".
      restApi.root.addMethod('ANY', integration);
      restApi.root.addResource('{proxy+}').addMethod('ANY', integration);

      // restApi.url is "https://{id}.execute-api.{region}.amazonaws.com/{stage}/";
      // HttpOrigin needs the bare host.
      const apiHostname = Fn.select(2, Fn.split('/', restApi.url));
      computeOrigins.set(
        ssrComputeName,
        new HttpOrigin(apiHostname, {
          originPath: `/${restApi.deploymentStage.stageName}`,
        }),
      );
    }

    // Other compute (image-opt etc.) stays on OAC + Function URL — GET-only,
    // not exposed to the body-hash bug. The SSR compute isn't in this map
    // (L3 skips its Function URL).
    if (props.computeFunctionUrls) {
      for (const [name, fnUrl] of props.computeFunctionUrls) {
        computeOrigins.set(
          name,
          FunctionUrlOrigin.withOriginAccessControl(fnUrl),
        );
      }
    }

    // Primary origin: prefer 'default' > 'server' > first available
    const primaryOrigin =
      computeOrigins.get('default') ??
      computeOrigins.get('server') ??
      computeOrigins.values().next().value;

    if (hasCompute && !primaryOrigin) {
      throw new HostingError('NoComputeOriginsError', {
        message: 'No compute origins configured',
        resolution:
          'Ensure at least one compute resource is defined in the deploy manifest',
      });
    }

    // ---- Middleware (Lambda@Edge viewer-request) ----
    const edgeLambdas = props.middlewareEdgeFunction
      ? [
          {
            functionVersion: props.middlewareEdgeFunction,
            eventType: LambdaEdgeEventType.VIEWER_REQUEST,
          },
        ]
      : undefined;

    // ---- x-forwarded-host propagation function ----
    // CloudFront strips the viewer's Host header when forwarding to Lambda Function
    // URL origins (ALL_VIEWER_EXCEPT_HOST_HEADER policy). OpenNext's converters use
    // x-forwarded-host to construct the public-facing URL for middleware rewrites and
    // image optimization fetches. Without it, URL construction uses the Function URL
    // domain which breaks path-only rewrites ("TypeError: Invalid URL").
    const forwardedHostFunction = hasCompute
      ? new CloudFrontFunction(this, 'ForwardedHostFunction', {
          code: FunctionCode.fromInline(
            [
              'function handler(event) {',
              '  var req = event.request;',
              '  var host = req.headers.host ? req.headers.host.value : undefined;',
              '  if (host) { req.headers["x-forwarded-host"] = { value: host }; }',
              '  return req;',
              '}',
            ].join('\n'),
          ),
          runtime: FunctionRuntime.JS_2_0,
          comment:
            'Copies Host header to x-forwarded-host for origin URL construction',
        })
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

    const makeComputeBehavior = (origin?: IOrigin): BehaviorOptions => ({
      origin: origin ?? primaryOrigin!,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachePolicy: CachePolicy.CACHING_DISABLED,
      compress: true,
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      responseHeadersPolicy: props.securityHeadersPolicy,
      ...(edgeLambdas ? { edgeLambdas } : {}),
      ...(forwardedHostFunction
        ? {
            functionAssociations: [
              {
                function: forwardedHostFunction,
                eventType: FunctionEventType.VIEWER_REQUEST,
              },
            ],
          }
        : {}),
    });

    // ---- Route → behavior mapping ----
    const additionalBehaviors: Record<string, BehaviorOptions> = {};

    // Separate catch-all from specific routes
    const catchAllRoute = manifest.routes.find(
      (r) => r.pattern === '/*' || r.pattern === '*',
    );
    const specificRoutes = manifest.routes.filter(
      (r) => r.pattern !== '/*' && r.pattern !== '*',
    );

    // Validate CloudFront behavior limit
    if (specificRoutes.length > MAX_ADDITIONAL_BEHAVIORS) {
      throw new HostingError('TooManyRoutesError', {
        message: `The manifest declares ${specificRoutes.length} specific routes, but CloudFront supports a maximum of ${MAX_ADDITIONAL_BEHAVIORS} additional cache behaviors.`,
        resolution:
          'Reduce the number of routes in your deploy manifest. Consider consolidating routes with similar patterns.',
      });
    }

    for (const route of specificRoutes) {
      const isStatic = route.target === 'static' || route.target === 's3';
      const cfPattern = normalizePatternForCloudFront(route.pattern);

      if (isStatic) {
        additionalBehaviors[cfPattern] = makeStaticBehavior();
      } else {
        // Look up per-compute origin, fall back to primary
        const targetOrigin = computeOrigins.get(route.target) ?? primaryOrigin;
        if (targetOrigin) {
          additionalBehaviors[cfPattern] = makeComputeBehavior(targetOrigin);
        } else {
          additionalBehaviors[cfPattern] = makeStaticBehavior();
        }
      }
    }

    // ---- Default behavior (from catch-all route) ----
    const defaultIsCompute =
      catchAllRoute &&
      catchAllRoute.target !== 'static' &&
      catchAllRoute.target !== 's3' &&
      hasCompute;

    const defaultBehavior = defaultIsCompute
      ? makeComputeBehavior(
          computeOrigins.get(catchAllRoute!.target) ?? primaryOrigin,
        )
      : makeStaticBehavior();

    // ---- Error responses ----
    const isSpaOnly = !hasCompute;

    const errorResponses: ErrorResponse[] = [
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
      httpVersion: HttpVersion.HTTP2_AND_3,
      priceClass: props.priceClass ?? PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      ...(props.certificate && props.domainName
        ? {
            domainNames: [props.domainName],
            certificate: props.certificate,
          }
        : {}),
      ...(props.webAcl ? { webAclId: props.webAcl.attrArn } : {}),
      ...(props.accessLogBucket
        ? { enableLogging: true, logBucket: props.accessLogBucket }
        : {}),
      ...(props.geoRestriction
        ? {
            geoRestriction:
              props.geoRestriction.type === 'whitelist'
                ? GeoRestriction.allowlist(...props.geoRestriction.countries)
                : GeoRestriction.denylist(...props.geoRestriction.countries),
          }
        : {}),
      errorResponses: errorResponses.length > 0 ? errorResponses : undefined,
    });

    // ---- OAC: S3 bucket policy ----
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

    // ---- OAC: Lambda Function URL permissions ----
    if (hasCompute) {
      // Remove CDK auto-generated CfnPermission resources for Function URL origins.
      // We create our own explicit permissions below with correct function ARNs.
      for (const child of this.distribution.node.findAll()) {
        if (
          child instanceof CfnPermission &&
          child.action === 'lambda:InvokeFunctionUrl'
        ) {
          child.node.scope?.node.tryRemoveChild(child.node.id);
        }
      }

      // Grant InvokeFunctionUrl only to OAC-fronted compute. The SSR Lambda
      // gets its grant from LambdaIntegration's auto-attached resource policy.
      const computeFnsWithUrls: Array<{ name: string; fn: IFunction }> = [];
      if (props.computeFunctionUrls && props.computeFunctions) {
        for (const [name] of props.computeFunctionUrls) {
          const fn = props.computeFunctions.get(name);
          if (fn) {
            computeFnsWithUrls.push({ name, fn });
          }
        }
      }

      for (const { name, fn } of computeFnsWithUrls) {
        new CfnPermission(this, `LambdaUrlPermission-${name}`, {
          action: 'lambda:InvokeFunctionUrl',
          principal: 'cloudfront.amazonaws.com',
          functionName: fn.functionArn,
          functionUrlAuthType: 'AWS_IAM',
          sourceArn: `arn:aws:cloudfront::${account}:distribution/${this.distribution.distributionId}`,
        });

        fn.addPermission(`CloudFrontOACInvoke-${name}`, {
          principal: new iam.ServicePrincipal('cloudfront.amazonaws.com'),
          action: 'lambda:InvokeFunction',
          sourceArn: `arn:aws:cloudfront::${account}:distribution/${this.distribution.distributionId}`,
        });
      }
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

/** Characters that indicate regex syntax — not valid in CloudFront path patterns. */
const REGEX_INDICATORS = /[\\^${}()|[\]+?]/;

/**
 * Normalize a route pattern into a CloudFront-compatible path pattern.
 *
 * CloudFront supports only simple glob patterns with `*` and `?` wildcards.
 * Regex or complex glob syntax is not supported and will cause deployment failures.
 */
const normalizePatternForCloudFront = (pattern: string): string => {
  if (REGEX_INDICATORS.test(pattern)) {
    throw new HostingError('InvalidRoutePatternError', {
      message: `Route pattern '${pattern}' contains regex syntax which CloudFront does not support.`,
      resolution:
        'CloudFront path patterns only support * (match any) and ? (match single char). ' +
        'Convert regex patterns to glob-style (e.g., /api/* instead of /api/(.*))',
    });
  }

  // Ensure pattern starts with /
  if (!pattern.startsWith('/')) {
    return `/${pattern}`;
  }
  return pattern;
};
