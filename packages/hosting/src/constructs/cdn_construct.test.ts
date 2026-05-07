import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { PriceClass } from 'aws-cdk-lib/aws-cloudfront';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import {
  Code,
  FunctionUrlAuthType,
  InvokeMode,
  Function as LambdaFunction,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { CdnConstruct } from './cdn_construct.js';
import { createSecurityHeadersPolicy } from './security_headers.js';
import { HostingError } from '../hosting_error.js';
import { DeployManifest } from '../manifest/types.js';

// ---- Test helpers ----

const createStack = (): Stack => {
  const app = new App();
  return new Stack(app, 'TestStack');
};

const createEnvStack = (
  region = 'us-east-1',
  account = '123456789012',
): Stack => {
  const app = new App();
  return new Stack(app, 'TestStack', { env: { account, region } });
};

const spaManifest: DeployManifest = {
  version: 1,
  compute: {},
  staticAssets: { directory: '/tmp/assets' },
  routes: [{ pattern: '/*', target: 'static' }],
  buildId: 'test-spa-1',
};

const ssrManifest: DeployManifest = {
  version: 1,
  compute: {
    default: {
      type: 'handler',
      bundle: '/tmp/bundle',
      handler: 'index.handler',
      placement: 'regional',
    },
  },
  staticAssets: { directory: '/tmp/assets' },
  routes: [
    { pattern: '/_next/static/*', target: 'static' },
    { pattern: '/favicon.ico', target: 'static' },
    { pattern: '/*', target: 'default' },
  ],
  buildId: 'test-ssr-1',
};

/**
 * Create a dummy Lambda + Function URL for SSR testing.
 */
const createSsrFunction = (stack: Stack) => {
  const fn = new LambdaFunction(stack, 'SsrFn', {
    runtime: Runtime.NODEJS_20_X,
    handler: 'index.handler',
    code: Code.fromInline('exports.handler = async () => {};'),
  });
  const fnUrl = fn.addFunctionUrl({
    authType: FunctionUrlAuthType.AWS_IAM,
    invokeMode: InvokeMode.RESPONSE_STREAM,
  });
  return { fn, fnUrl };
};

// ================================================================
// CdnConstruct — unit tests
// ================================================================

void describe('CdnConstruct', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdn-construct-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ---- SPA mode ----

  void describe('SPA mode (no compute)', () => {
    void it('creates CloudFront distribution with S3 origin', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      const cdn = new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      assert.ok(cdn.distribution);
      assert.ok(cdn.distributionUrl);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          HttpVersion: 'http2and3',
        }),
      });
    });

    void it('creates 403/404 error responses for SPA', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          CustomErrorResponses: Match.arrayWith([
            Match.objectLike({ ErrorCode: 403, ResponseCode: 200 }),
            Match.objectLike({ ErrorCode: 404, ResponseCode: 200 }),
          ]),
        }),
      });
    });

    void it('creates BuildId CloudFront Function', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Function', {
        FunctionCode: Match.stringLikeRegexp('test-spa-1'),
      });
    });
  });

  // ---- SSR mode ----

  void describe('SSR mode (with compute)', () => {
    void it('creates distribution with Lambda Function URL origin', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});
      const { fn, fnUrl } = createSsrFunction(stack);

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: ssrManifest,
        securityHeadersPolicy: policy,
        ssrFunctionUrl: fnUrl,
        ssrFunction: fn,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          DefaultCacheBehavior: Match.objectLike({
            AllowedMethods: Match.arrayWith([
              'GET',
              'HEAD',
              'OPTIONS',
              'PUT',
              'PATCH',
              'POST',
              'DELETE',
            ]),
          }),
        }),
      });
    });

    void it('creates additional behaviors for static routes', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});
      const { fn, fnUrl } = createSsrFunction(stack);

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: ssrManifest,
        securityHeadersPolicy: policy,
        ssrFunctionUrl: fnUrl,
        ssrFunction: fn,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          CacheBehaviors: Match.arrayWith([
            Match.objectLike({
              PathPattern: '/_next/static/*',
            }),
            Match.objectLike({
              PathPattern: '/favicon.ico',
            }),
          ]),
        }),
      });
    });

    void it('creates 5xx error responses for SSR', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});
      const { fn, fnUrl } = createSsrFunction(stack);

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: ssrManifest,
        securityHeadersPolicy: policy,
        ssrFunctionUrl: fnUrl,
        ssrFunction: fn,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          CustomErrorResponses: Match.arrayWith([
            Match.objectLike({ ErrorCode: 502 }),
            Match.objectLike({ ErrorCode: 503 }),
            Match.objectLike({ ErrorCode: 504 }),
          ]),
        }),
      });
    });
  });

  // ---- Validation ----

  void describe('validation', () => {
    void it('throws MissingBuildIdError when buildId is not set', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      const manifestWithoutBuildId: DeployManifest = {
        version: 1,
        compute: {},
        staticAssets: { directory: '/tmp/assets' },
        routes: [{ pattern: '/*', target: 'static' }],
      };

      assert.throws(
        () =>
          new CdnConstruct(stack, 'Cdn', {
            bucket,
            manifest: manifestWithoutBuildId,
            securityHeadersPolicy: policy,
          }),
        (error: unknown) => {
          assert.ok(error instanceof HostingError);
          assert.strictEqual(error.name, 'MissingBuildIdError');
          return true;
        },
      );
    });

    void it('throws TooManyRoutesError for >24 specific routes', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      const manyRoutes = Array.from({ length: 25 }, (_, i) => ({
        pattern: `/route-${i}`,
        target: 'static',
      }));
      manyRoutes.push({ pattern: '/*', target: 'static' });

      const manifest: DeployManifest = {
        version: 1,
        compute: {},
        staticAssets: { directory: '/tmp/assets' },
        routes: manyRoutes,
        buildId: 'test-1',
      };

      assert.throws(
        () =>
          new CdnConstruct(stack, 'Cdn', {
            bucket,
            manifest,
            securityHeadersPolicy: policy,
          }),
        (error: unknown) => {
          assert.ok(error instanceof HostingError);
          assert.strictEqual(error.name, 'TooManyRoutesError');
          return true;
        },
      );
    });

    void it('throws EmptyGeoRestrictionError for empty countries', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      assert.throws(
        () =>
          new CdnConstruct(stack, 'Cdn', {
            bucket,
            manifest: spaManifest,
            securityHeadersPolicy: policy,
            geoRestriction: { type: 'whitelist', countries: [] },
          }),
        (error: unknown) => {
          assert.ok(error instanceof HostingError);
          assert.strictEqual(error.name, 'EmptyGeoRestrictionError');
          return true;
        },
      );
    });
  });

  // ---- Optional features ----

  void describe('optional features', () => {
    void it('applies WAF WebACL', () => {
      const stack = createEnvStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      const webAcl = new CfnWebACL(stack, 'WebAcl', {
        scope: 'CLOUDFRONT',
        defaultAction: { allow: {} },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'test',
          sampledRequestsEnabled: true,
        },
      });

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
        webAcl,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          WebACLId: Match.anyValue(),
        }),
      });
    });

    void it('sets custom domain name and certificate', () => {
      const stack = createEnvStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});
      const cert = Certificate.fromCertificateArn(
        stack,
        'Cert',
        'arn:aws:acm:us-east-1:123456789012:certificate/test-id',
      );

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
        certificate: cert,
        domainName: 'example.com',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          Aliases: ['example.com'],
        }),
      });
    });

    void it('uses custom price class', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
        priceClass: PriceClass.PRICE_CLASS_ALL,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          PriceClass: 'PriceClass_All',
        }),
      });
    });

    void it('applies geo restriction', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
        geoRestriction: { type: 'whitelist', countries: ['US', 'CA'] },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          Restrictions: Match.objectLike({
            GeoRestriction: Match.objectLike({
              RestrictionType: 'whitelist',
              Locations: ['US', 'CA'],
            }),
          }),
        }),
      });
    });
  });

  // ---- OAC ----

  void describe('OAC permissions', () => {
    void it('adds S3 bucket policy for CloudFront access', () => {
      const stack = createEnvStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 's3:GetObject',
              Principal: { Service: 'cloudfront.amazonaws.com' },
            }),
          ]),
        }),
      });
    });
  });
});
