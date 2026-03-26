import { Construct } from 'constructs';
import { RemovalPolicy, Duration } from 'aws-cdk-lib';
import {
  Distribution,
  ViewerProtocolPolicy,
  CachePolicy,
  AllowedMethods,
  HttpVersion,
  PriceClass,
  ErrorResponse,
  Function as CloudFrontFunction,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  Bucket,
  BlockPublicAccess,
  BucketEncryption,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';

export interface StaticHostingProps {
  /**
   * Build ID for atomic deploys. Assets are stored under `builds/{buildId}/` prefix.
   */
  buildId: string;

  /**
   * Optional friendly name suffix for the resources.
   */
  name?: string;
}

/**
 * L2-ish construct that creates an S3 bucket (private, OAC-secured)
 * and a CloudFront distribution for static hosting.
 */
export class StaticHosting extends Construct {
  readonly bucket: Bucket;
  readonly distribution: Distribution;
  readonly buildIdFunction: CloudFrontFunction;

  constructor(scope: Construct, id: string, props: StaticHostingProps) {
    super(scope, id);

    const { buildId } = props;

    // Private S3 bucket for hosting assets
    this.bucket = new Bucket(this, 'HostingBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront Function for Build ID rewriting (atomic deploys)
    this.buildIdFunction = new CloudFrontFunction(
      this,
      'BuildIdRewriteFunction',
      {
        code: FunctionCode.fromInline(generateBuildIdFunctionCode(buildId)),
        runtime: FunctionRuntime.JS_2_0,
        comment: `Rewrites request URIs to include build ID prefix: builds/${buildId}/`,
      },
    );

    // S3 origin with Origin Access Control (OAC) — NOT legacy OAI
    const s3Origin = S3BucketOrigin.withOriginAccessControl(this.bucket);

    // CloudFront distribution
    this.distribution = new Distribution(this, 'HostingDistribution', {
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [
          {
            function: this.buildIdFunction,
            eventType: FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      defaultRootObject: 'index.html',
      httpVersion: HttpVersion.HTTP2_AND_3,
      priceClass: PriceClass.PRICE_CLASS_100,
      // SPA error handling: 403 (S3 access denied for missing keys) → index.html
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
    });
  }
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
