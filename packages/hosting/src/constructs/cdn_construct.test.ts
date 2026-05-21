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
        computeFunctionUrls: new Map([['default', fnUrl]]),
        computeFunctions: new Map([['default', fn]]),
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
        computeFunctionUrls: new Map([['default', fnUrl]]),
        computeFunctions: new Map([['default', fn]]),
      });

      // CdnConstruct sorts cache behaviors by descending specificity so
      // that literal paths win over wildcards (CloudFront evaluates first-
      // match-wins). `/favicon.ico` (literal, 0 wildcards) ends up before
      // `/_next/static/*` (1 wildcard), so we assert each separately
      // rather than rely on a relative-order arrayWith.
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          CacheBehaviors: Match.arrayWith([
            Match.objectLike({ PathPattern: '/_next/static/*' }),
          ]),
        }),
      });
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          CacheBehaviors: Match.arrayWith([
            Match.objectLike({ PathPattern: '/favicon.ico' }),
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
        computeFunctionUrls: new Map([['default', fnUrl]]),
        computeFunctions: new Map([['default', fn]]),
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

  // ---- Multi-origin routing ----

  void describe('multi-origin routing', () => {
    void it('routes /api/* to api origin and /* to default origin', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      // Create two separate Lambda functions for default and api compute
      const defaultFn = new LambdaFunction(stack, 'DefaultFn', {
        runtime: Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: Code.fromInline('exports.handler = async () => {};'),
      });
      const defaultFnUrl = defaultFn.addFunctionUrl({
        authType: FunctionUrlAuthType.AWS_IAM,
        invokeMode: InvokeMode.RESPONSE_STREAM,
      });

      const apiFn = new LambdaFunction(stack, 'ApiFn', {
        runtime: Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: Code.fromInline('exports.handler = async () => {};'),
      });
      const apiFnUrl = apiFn.addFunctionUrl({
        authType: FunctionUrlAuthType.AWS_IAM,
        invokeMode: InvokeMode.RESPONSE_STREAM,
      });

      const multiOriginManifest: DeployManifest = {
        version: 1,
        compute: {
          default: {
            type: 'handler',
            bundle: '/tmp/bundle-default',
            handler: 'index.handler',
            placement: 'regional',
          },
          api: {
            type: 'handler',
            bundle: '/tmp/bundle-api',
            handler: 'index.handler',
            placement: 'regional',
          },
        },
        staticAssets: { directory: '/tmp/assets' },
        routes: [
          { pattern: '/api/*', target: 'api' },
          { pattern: '/*', target: 'default' },
        ],
        buildId: 'test-multi-origin-1',
      };

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: multiOriginManifest,
        securityHeadersPolicy: policy,
        computeFunctionUrls: new Map([
          ['default', defaultFnUrl],
          ['api', apiFnUrl],
        ]),
        computeFunctions: new Map([
          ['default', defaultFn],
          ['api', apiFn],
        ]),
      });

      const template = Template.fromStack(stack);

      // Verify CloudFront distribution has a /api/* cache behavior
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          CacheBehaviors: Match.arrayWith([
            Match.objectLike({
              PathPattern: '/api/*',
            }),
          ]),
        }),
      });

      // Verify there are at least 2 origins (one per compute function URL)
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          Origins: Match.arrayWith([
            Match.objectLike({
              DomainName: Match.anyValue(),
            }),
            Match.objectLike({
              DomainName: Match.anyValue(),
            }),
          ]),
        }),
      });

      // Verify the default behavior uses ALL allowed methods (compute)
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
  });

  // ---- TLS Protocol ----

  void describe('TLS protocol version', () => {
    void it('sets minimum TLS protocol version to TLSv1.2_2021', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});
      const cert = Certificate.fromCertificateArn(
        stack,
        'TlsCert',
        'arn:aws:acm:us-east-1:123456789012:certificate/tls-test-id',
      );

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
        certificate: cert,
        domainName: 'tls-test.example.com',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          ViewerCertificate: Match.objectLike({
            MinimumProtocolVersion: 'TLSv1.2_2021',
          }),
        }),
      });
    });
  });

  // ---- HTTP version ----

  void describe('HTTP version', () => {
    void it('enables HTTP/2 and HTTP/3', () => {
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
          HttpVersion: 'http2and3',
        }),
      });
    });
  });

  // ---- Default price class ----

  void describe('default price class', () => {
    void it('defaults to PRICE_CLASS_100', () => {
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
          PriceClass: 'PriceClass_100',
        }),
      });
    });
  });

  // ---- Access logging ----

  void describe('access logging', () => {
    void it('enables logging when accessLogBucket is provided', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const logBucket = new Bucket(stack, 'LogBucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
        accessLogBucket: logBucket,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          Logging: Match.objectLike({
            Bucket: Match.anyValue(),
          }),
        }),
      });
    });

    void it('does not enable logging when accessLogBucket is omitted', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      // Distribution should NOT have logging
      const distributions = template.findResources(
        'AWS::CloudFront::Distribution',
      );
      const dist = Object.values(distributions)[0] as Record<
        string,
        Record<string, unknown>
      >;
      const config = dist.Properties.DistributionConfig as Record<
        string,
        unknown
      >;
      assert.strictEqual(
        config.Logging,
        undefined,
        'Should not have logging when no log bucket',
      );
    });
  });

  // ---- Geo restriction: blacklist ----

  void describe('geo restriction blacklist', () => {
    void it('applies denylist geo restriction', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
        geoRestriction: { type: 'blacklist', countries: ['RU', 'CN'] },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          Restrictions: Match.objectLike({
            GeoRestriction: Match.objectLike({
              RestrictionType: 'blacklist',
              Locations: ['RU', 'CN'],
            }),
          }),
        }),
      });
    });
  });

  // ---- InvalidRoutePatternError ----

  void describe('InvalidRoutePatternError', () => {
    void it('throws for regex syntax in route pattern', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      const manifest: DeployManifest = {
        version: 1,
        compute: {},
        staticAssets: { directory: '/tmp/assets' },
        routes: [
          { pattern: '/api/(.*)', target: 'static' },
          { pattern: '/*', target: 'static' },
        ],
        buildId: 'test-regex',
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
          assert.strictEqual(error.name, 'InvalidRoutePatternError');
          return true;
        },
      );
    });
  });

  // ---- NoComputeOriginsError ----

  void describe('NoComputeOriginsError', () => {
    void it('throws when computeFunctionUrls is empty and routes target compute', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      const manifest: DeployManifest = {
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
        routes: [{ pattern: '/*', target: 'default' }],
        buildId: 'test-no-origins',
      };

      assert.throws(
        () =>
          new CdnConstruct(stack, 'Cdn', {
            bucket,
            manifest,
            securityHeadersPolicy: policy,
            computeFunctionUrls: new Map(),
          }),
        (error: unknown) => {
          assert.ok(error instanceof HostingError);
          assert.strictEqual(error.name, 'NoComputeOriginsError');
          return true;
        },
      );
    });

    void it('creates compute origin when computeFunctionUrls has entries', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});
      const { fn, fnUrl } = createSsrFunction(stack);

      const manifest: DeployManifest = {
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
        routes: [{ pattern: '/*', target: 'default' }],
        buildId: 'test-with-origins',
      };

      const cdn = new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest,
        securityHeadersPolicy: policy,
        computeFunctionUrls: new Map([['default', fnUrl]]),
        computeFunctions: new Map([['default', fn]]),
      });

      assert.ok(cdn.distribution, 'Should create distribution');
      const template = Template.fromStack(stack);
      // Default behavior should allow all methods (compute)
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          DefaultCacheBehavior: Match.objectLike({
            AllowedMethods: Match.arrayWith(['POST', 'DELETE']),
          }),
        }),
      });
    });
  });

  // ---- BuildId CloudFront Function ----

  void describe('BuildId rewrite function', () => {
    void it('creates CloudFront Function with build ID in code', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      const manifest: DeployManifest = {
        ...spaManifest,
        buildId: 'custom-build-123',
      };

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Function', {
        FunctionCode: Match.stringLikeRegexp('custom-build-123'),
      });
    });
  });

  // ---- Distribution URL output ----

  void describe('distribution URL', () => {
    void it('uses custom domain in distributionUrl when domainName is set', () => {
      const stack = createEnvStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});
      const cert = Certificate.fromCertificateArn(
        stack,
        'Cert',
        'arn:aws:acm:us-east-1:123456789012:certificate/test-id',
      );

      const cdn = new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
        certificate: cert,
        domainName: 'my-site.example.com',
      });

      assert.strictEqual(cdn.distributionUrl, 'https://my-site.example.com');
    });

    void it('uses CloudFront domain when no custom domainName', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      const cdn = new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      assert.ok(
        cdn.distributionUrl.startsWith('https://'),
        'URL should start with https://',
      );
      const isTokenizedUrl = cdn.distributionUrl.includes('${Token');
      const isCloudFrontHost = !isTokenizedUrl
        ? (() => {
            try {
              const hostname = new URL(cdn.distributionUrl).hostname;
              return (
                hostname === 'cloudfront.net' ||
                hostname.endsWith('.cloudfront.net')
              );
            } catch {
              return false;
            }
          })()
        : false;
      assert.ok(
        isCloudFrontHost || isTokenizedUrl,
        'URL should use CloudFront domain or token',
      );
    });
  });

  // ---- Viewer protocol policy ----

  void describe('viewer protocol policy', () => {
    void it('redirects HTTP to HTTPS for static behaviors', () => {
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
          DefaultCacheBehavior: Match.objectLike({
            ViewerProtocolPolicy: 'redirect-to-https',
          }),
        }),
      });
    });
  });

  // ---- CSP ResponseHeadersPolicy on behaviors ----

  void describe('CSP applied on all behaviors via ResponseHeadersPolicy', () => {
    void it('default behavior references a ResponseHeadersPolicyId', () => {
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
          DefaultCacheBehavior: Match.objectLike({
            ResponseHeadersPolicyId: Match.anyValue(),
          }),
        }),
      });
    });

    void it('all additional behaviors reference a ResponseHeadersPolicyId', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});
      const { fn, fnUrl } = createSsrFunction(stack);

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: ssrManifest,
        securityHeadersPolicy: policy,
        computeFunctionUrls: new Map([['default', fnUrl]]),
        computeFunctions: new Map([['default', fn]]),
      });

      const template = Template.fromStack(stack);
      const distributions = template.findResources(
        'AWS::CloudFront::Distribution',
      );
      const distConfig = (
        Object.values(distributions)[0] as Record<
          string,
          Record<string, unknown>
        >
      ).Properties.DistributionConfig as Record<string, unknown>;
      const cacheBehaviors = distConfig.CacheBehaviors as Array<
        Record<string, unknown>
      >;

      assert.ok(
        cacheBehaviors && cacheBehaviors.length > 0,
        'Should have additional cache behaviors',
      );
      for (const behavior of cacheBehaviors) {
        assert.ok(
          behavior.ResponseHeadersPolicyId !== undefined,
          `Behavior for ${String(behavior.PathPattern)} should have ResponseHeadersPolicyId`,
        );
      }
    });
  });

  // ---- Multi-compute TargetOriginId binding ----

  void describe('multi-compute TargetOriginId binding', () => {
    void it('api behavior TargetOriginId differs from default behavior TargetOriginId', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      const defaultFn = new LambdaFunction(stack, 'DefaultFn2', {
        runtime: Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: Code.fromInline('exports.handler = async () => {};'),
      });
      const defaultFnUrl = defaultFn.addFunctionUrl({
        authType: FunctionUrlAuthType.AWS_IAM,
        invokeMode: InvokeMode.RESPONSE_STREAM,
      });

      const apiFn = new LambdaFunction(stack, 'ApiFn2', {
        runtime: Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: Code.fromInline('exports.handler = async () => {};'),
      });
      const apiFnUrl = apiFn.addFunctionUrl({
        authType: FunctionUrlAuthType.AWS_IAM,
        invokeMode: InvokeMode.RESPONSE_STREAM,
      });

      const multiOriginManifest: DeployManifest = {
        version: 1,
        compute: {
          default: {
            type: 'handler',
            bundle: '/tmp/bundle-default',
            handler: 'index.handler',
            placement: 'regional',
          },
          api: {
            type: 'handler',
            bundle: '/tmp/bundle-api',
            handler: 'index.handler',
            placement: 'regional',
          },
        },
        staticAssets: { directory: '/tmp/assets' },
        routes: [
          { pattern: '/api/*', target: 'api' },
          { pattern: '/*', target: 'default' },
        ],
        buildId: 'test-origin-binding-1',
      };

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: multiOriginManifest,
        securityHeadersPolicy: policy,
        computeFunctionUrls: new Map([
          ['default', defaultFnUrl],
          ['api', apiFnUrl],
        ]),
        computeFunctions: new Map([
          ['default', defaultFn],
          ['api', apiFn],
        ]),
      });

      const template = Template.fromStack(stack);
      const distributions = template.findResources(
        'AWS::CloudFront::Distribution',
      );
      const distConfig = (
        Object.values(distributions)[0] as Record<
          string,
          Record<string, unknown>
        >
      ).Properties.DistributionConfig as Record<string, unknown>;

      const defaultBehavior = distConfig.DefaultCacheBehavior as Record<
        string,
        unknown
      >;
      const cacheBehaviors = distConfig.CacheBehaviors as Array<
        Record<string, unknown>
      >;

      // Find the /api/* behavior
      const apiBehavior = cacheBehaviors.find(
        (b) => b.PathPattern === '/api/*',
      );
      assert.ok(apiBehavior, 'Should have a /api/* cache behavior');

      const defaultOriginId = defaultBehavior.TargetOriginId;
      const apiOriginId = apiBehavior.TargetOriginId;

      assert.ok(defaultOriginId, 'Default behavior should have TargetOriginId');
      assert.ok(apiOriginId, '/api/* behavior should have TargetOriginId');
      assert.notStrictEqual(
        defaultOriginId,
        apiOriginId,
        'Default and API behaviors must route to DIFFERENT origins',
      );
    });

    void it('each behavior TargetOriginId matches an origin in the Origins array', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      const defaultFn = new LambdaFunction(stack, 'DefFn3', {
        runtime: Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: Code.fromInline('exports.handler = async () => {};'),
      });
      const defaultFnUrl = defaultFn.addFunctionUrl({
        authType: FunctionUrlAuthType.AWS_IAM,
        invokeMode: InvokeMode.RESPONSE_STREAM,
      });

      const apiFn = new LambdaFunction(stack, 'ApiFn3', {
        runtime: Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: Code.fromInline('exports.handler = async () => {};'),
      });
      const apiFnUrl = apiFn.addFunctionUrl({
        authType: FunctionUrlAuthType.AWS_IAM,
        invokeMode: InvokeMode.RESPONSE_STREAM,
      });

      const manifest: DeployManifest = {
        version: 1,
        compute: {
          default: {
            type: 'handler',
            bundle: '/tmp/b1',
            handler: 'index.handler',
            placement: 'regional',
          },
          api: {
            type: 'handler',
            bundle: '/tmp/b2',
            handler: 'index.handler',
            placement: 'regional',
          },
        },
        staticAssets: { directory: '/tmp/assets' },
        routes: [
          { pattern: '/api/*', target: 'api' },
          { pattern: '/_next/static/*', target: 'static' },
          { pattern: '/*', target: 'default' },
        ],
        buildId: 'test-origin-binding-2',
      };

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest,
        securityHeadersPolicy: policy,
        computeFunctionUrls: new Map([
          ['default', defaultFnUrl],
          ['api', apiFnUrl],
        ]),
        computeFunctions: new Map([
          ['default', defaultFn],
          ['api', apiFn],
        ]),
      });

      const template = Template.fromStack(stack);
      const distributions = template.findResources(
        'AWS::CloudFront::Distribution',
      );
      const distConfig = (
        Object.values(distributions)[0] as Record<
          string,
          Record<string, unknown>
        >
      ).Properties.DistributionConfig as Record<string, unknown>;

      const origins = distConfig.Origins as Array<Record<string, unknown>>;
      const originIds = new Set(origins.map((o) => o.Id));

      const defaultBehavior = distConfig.DefaultCacheBehavior as Record<
        string,
        unknown
      >;
      const cacheBehaviors = distConfig.CacheBehaviors as Array<
        Record<string, unknown>
      >;

      // Default behavior TargetOriginId must exist in origins
      assert.ok(
        originIds.has(defaultBehavior.TargetOriginId as string),
        `Default behavior TargetOriginId '${String(defaultBehavior.TargetOriginId)}' must match an origin`,
      );

      // All additional behaviors must reference valid origins
      for (const behavior of cacheBehaviors) {
        assert.ok(
          originIds.has(behavior.TargetOriginId as string),
          `Behavior ${String(behavior.PathPattern)} TargetOriginId '${String(behavior.TargetOriginId)}' must match an origin`,
        );
      }
    });
  });

  // ---- OAC Lambda Permission specifics ----

  void describe('OAC Lambda permissions per-function', () => {
    void it('each compute function gets a Permission with lambda:InvokeFunctionUrl', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      const defaultFn = new LambdaFunction(stack, 'OacDefaultFn', {
        runtime: Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: Code.fromInline('exports.handler = async () => {};'),
      });
      const defaultFnUrl = defaultFn.addFunctionUrl({
        authType: FunctionUrlAuthType.AWS_IAM,
        invokeMode: InvokeMode.RESPONSE_STREAM,
      });

      const apiFn = new LambdaFunction(stack, 'OacApiFn', {
        runtime: Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: Code.fromInline('exports.handler = async () => {};'),
      });
      const apiFnUrl = apiFn.addFunctionUrl({
        authType: FunctionUrlAuthType.AWS_IAM,
        invokeMode: InvokeMode.RESPONSE_STREAM,
      });

      const manifest: DeployManifest = {
        version: 1,
        compute: {
          default: {
            type: 'handler',
            bundle: '/tmp/b1',
            handler: 'index.handler',
            placement: 'regional',
          },
          api: {
            type: 'handler',
            bundle: '/tmp/b2',
            handler: 'index.handler',
            placement: 'regional',
          },
        },
        staticAssets: { directory: '/tmp/assets' },
        routes: [
          { pattern: '/api/*', target: 'api' },
          { pattern: '/*', target: 'default' },
        ],
        buildId: 'test-oac-perms-1',
      };

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest,
        securityHeadersPolicy: policy,
        computeFunctionUrls: new Map([
          ['default', defaultFnUrl],
          ['api', apiFnUrl],
        ]),
        computeFunctions: new Map([
          ['default', defaultFn],
          ['api', apiFn],
        ]),
      });

      const template = Template.fromStack(stack);
      const permissions = template.findResources('AWS::Lambda::Permission');

      // Find all InvokeFunctionUrl permissions from CDN construct
      const invokeUrlPerms = Object.entries(permissions).filter(
        ([, resource]) => {
          const props = (resource as Record<string, Record<string, unknown>>)
            .Properties;
          return (
            props.Action === 'lambda:InvokeFunctionUrl' &&
            props.Principal === 'cloudfront.amazonaws.com'
          );
        },
      );

      // Each compute function that has a URL should get exactly 1 InvokeFunctionUrl permission
      assert.strictEqual(
        invokeUrlPerms.length,
        2,
        'Should have exactly 2 InvokeFunctionUrl permissions (one per compute function)',
      );
    });

    void it('each InvokeFunctionUrl permission has correct FunctionName', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      const defaultFn = new LambdaFunction(stack, 'PermDefaultFn', {
        runtime: Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: Code.fromInline('exports.handler = async () => {};'),
      });
      const defaultFnUrl = defaultFn.addFunctionUrl({
        authType: FunctionUrlAuthType.AWS_IAM,
        invokeMode: InvokeMode.RESPONSE_STREAM,
      });

      const apiFn = new LambdaFunction(stack, 'PermApiFn', {
        runtime: Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: Code.fromInline('exports.handler = async () => {};'),
      });
      const apiFnUrl = apiFn.addFunctionUrl({
        authType: FunctionUrlAuthType.AWS_IAM,
        invokeMode: InvokeMode.RESPONSE_STREAM,
      });

      const manifest: DeployManifest = {
        version: 1,
        compute: {
          default: {
            type: 'handler',
            bundle: '/tmp/b1',
            handler: 'index.handler',
            placement: 'regional',
          },
          api: {
            type: 'handler',
            bundle: '/tmp/b2',
            handler: 'index.handler',
            placement: 'regional',
          },
        },
        staticAssets: { directory: '/tmp/assets' },
        routes: [
          { pattern: '/api/*', target: 'api' },
          { pattern: '/*', target: 'default' },
        ],
        buildId: 'test-oac-perms-2',
      };

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest,
        securityHeadersPolicy: policy,
        computeFunctionUrls: new Map([
          ['default', defaultFnUrl],
          ['api', apiFnUrl],
        ]),
        computeFunctions: new Map([
          ['default', defaultFn],
          ['api', apiFn],
        ]),
      });

      const template = Template.fromStack(stack);
      const permissions = template.findResources('AWS::Lambda::Permission');
      const lambdas = template.findResources('AWS::Lambda::Function');

      // Collect Lambda function ARN refs
      const lambdaLogicalIds = Object.keys(lambdas);

      const invokeUrlPerms = Object.entries(permissions).filter(
        ([, resource]) => {
          const props = (resource as Record<string, Record<string, unknown>>)
            .Properties;
          return (
            props.Action === 'lambda:InvokeFunctionUrl' &&
            props.Principal === 'cloudfront.amazonaws.com'
          );
        },
      );

      // Each permission's FunctionName must reference a Lambda function (via GetAtt or Ref)
      for (const [permId, resource] of invokeUrlPerms) {
        const props = (resource as Record<string, Record<string, unknown>>)
          .Properties;
        const fnName = props.FunctionName as Record<string, unknown>;

        // eslint-disable-next-line spellcheck/spell-checker
        // CDK uses { 'Fn::GetAtt': [logicalId, 'Arn'] } or { Ref: logicalId }
        const refId = fnName['Fn::GetAtt']
          ? (fnName['Fn::GetAtt'] as string[])[0]
          : (fnName['Ref'] as string | undefined);

        assert.ok(
          refId && lambdaLogicalIds.includes(refId),
          `Permission ${permId} FunctionName must reference a Lambda function`,
        );
      }
    });

    void it('edge functions do NOT get InvokeFunctionUrl permissions', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});

      // Only one compute function with a URL
      const defaultFn = new LambdaFunction(stack, 'EdgeTestFn', {
        runtime: Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: Code.fromInline('exports.handler = async () => {};'),
      });
      const defaultFnUrl = defaultFn.addFunctionUrl({
        authType: FunctionUrlAuthType.AWS_IAM,
        invokeMode: InvokeMode.RESPONSE_STREAM,
      });

      // Simulate edge function: it has no function URL (not in computeFunctionUrls)
      const edgeFn = new LambdaFunction(stack, 'EdgeFn', {
        runtime: Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: Code.fromInline('exports.handler = async () => {};'),
      });

      const manifest: DeployManifest = {
        version: 1,
        compute: {
          default: {
            type: 'handler',
            bundle: '/tmp/b1',
            handler: 'index.handler',
            placement: 'regional',
          },
          middleware: {
            type: 'edge',
            bundle: '/tmp/b-edge',
            handler: 'index.handler',
            placement: 'global',
          },
        },
        staticAssets: { directory: '/tmp/assets' },
        routes: [{ pattern: '/*', target: 'default' }],
        buildId: 'test-edge-no-perm',
      };

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest,
        securityHeadersPolicy: policy,
        // Only the regional function has a URL; edge does not
        computeFunctionUrls: new Map([['default', defaultFnUrl]]),
        computeFunctions: new Map([
          ['default', defaultFn],
          ['middleware', edgeFn],
        ]),
      });

      const template = Template.fromStack(stack);
      const permissions = template.findResources('AWS::Lambda::Permission');

      const invokeUrlPerms = Object.entries(permissions).filter(
        ([, resource]) => {
          const props = (resource as Record<string, Record<string, unknown>>)
            .Properties;
          return (
            props.Action === 'lambda:InvokeFunctionUrl' &&
            props.Principal === 'cloudfront.amazonaws.com'
          );
        },
      );

      // Only 1 permission for the 'default' function — edge function must NOT get one
      assert.strictEqual(
        invokeUrlPerms.length,
        1,
        'Edge functions should NOT get InvokeFunctionUrl permissions',
      );

      // Verify the single permission references the correct function (defaultFn, not edgeFn)
      const lambdas = template.findResources('AWS::Lambda::Function');
      const edgeFnLogicalId = Object.keys(lambdas).find((key) =>
        key.includes('EdgeFn'),
      );

      for (const [, resource] of invokeUrlPerms) {
        const props = (resource as Record<string, Record<string, unknown>>)
          .Properties;
        const fnName = props.FunctionName as Record<string, unknown>;
        const refId = fnName['Fn::GetAtt']
          ? (fnName['Fn::GetAtt'] as string[])[0]
          : (fnName['Ref'] as string | undefined);

        assert.notStrictEqual(
          refId,
          edgeFnLogicalId,
          'InvokeFunctionUrl permission must NOT reference the edge function',
        );
      }
    });
  });

  // ---- Error page ResponsePagePath with buildId prefix ----

  void describe('error page ResponsePagePath with buildId prefix', () => {
    void it('SPA error responses use buildId prefix in ResponsePagePath', () => {
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
            Match.objectLike({
              ErrorCode: 403,
              ResponseCode: 200,
              ResponsePagePath: `/builds/${spaManifest.buildId}/index.html`,
            }),
            Match.objectLike({
              ErrorCode: 404,
              ResponseCode: 200,
              ResponsePagePath: `/builds/${spaManifest.buildId}/index.html`,
            }),
          ]),
        }),
      });
    });

    void it('SSR error responses use buildId prefix in ResponsePagePath for 5xx errors', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});
      const { fn, fnUrl } = createSsrFunction(stack);

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: ssrManifest,
        securityHeadersPolicy: policy,
        computeFunctionUrls: new Map([['default', fnUrl]]),
        computeFunctions: new Map([['default', fn]]),
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          CustomErrorResponses: Match.arrayWith([
            Match.objectLike({
              ErrorCode: 502,
              ResponsePagePath: `/builds/${ssrManifest.buildId}/_error.html`,
            }),
            Match.objectLike({
              ErrorCode: 503,
              ResponsePagePath: `/builds/${ssrManifest.buildId}/_error.html`,
            }),
            Match.objectLike({
              ErrorCode: 504,
              ResponsePagePath: `/builds/${ssrManifest.buildId}/_error.html`,
            }),
          ]),
        }),
      });
    });

    void it('error page path pattern includes buildId for atomic deploys', () => {
      const customBuildId = 'my-custom-build-42';
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'SH', {});
      const { fn, fnUrl } = createSsrFunction(stack);

      const manifestWithCustomBuildId: DeployManifest = {
        ...ssrManifest,
        buildId: customBuildId,
      };

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: manifestWithCustomBuildId,
        securityHeadersPolicy: policy,
        computeFunctionUrls: new Map([['default', fnUrl]]),
        computeFunctions: new Map([['default', fn]]),
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
          CustomErrorResponses: Match.arrayWith([
            Match.objectLike({
              ErrorCode: 502,
              ResponsePagePath: `/builds/${customBuildId}/_error.html`,
            }),
          ]),
        }),
      });
    });
  });
});
