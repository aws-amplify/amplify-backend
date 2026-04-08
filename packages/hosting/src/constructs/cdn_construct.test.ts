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
import { DeployManifest, ManifestRoute } from '../manifest/types.js';

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
  routes: [{ path: '/*', target: { kind: 'Static' } }],
  framework: { name: 'spa' },
  buildId: 'test-spa-1',
};

const ssrManifest: DeployManifest = {
  version: 1,
  routes: [
    { path: '/_next/static/*', target: { kind: 'Static' } },
    { path: '/favicon.ico', target: { kind: 'Static' } },
    { path: '/*', target: { kind: 'Compute', src: 'default' } },
  ],
  computeResources: [
    { name: 'default', runtime: 'nodejs20.x', entrypoint: 'run.sh' },
  ],
  framework: { name: 'nextjs', version: '15.0.0' },
  buildId: 'test-ssr-1',
};

/**
 * Create a Lambda function + Function URL for SSR CDN tests.
 * Requires a tmp dir with a Lambda code asset.
 */
const createSsrFunction = (stack: Stack, computeDir: string) => {
  const fn = new LambdaFunction(stack, 'SsrFn', {
    runtime: Runtime.NODEJS_20_X,
    handler: 'run.sh',
    code: Code.fromAsset(computeDir),
  });
  const fnUrl = fn.addFunctionUrl({
    authType: FunctionUrlAuthType.AWS_IAM,
    invokeMode: InvokeMode.RESPONSE_STREAM,
  });
  return { fn, fnUrl };
};

// ================================================================
// CdnConstruct — isolated unit tests
// ================================================================

void describe('CdnConstruct', () => {
  let tmpDir: string;
  let computeDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdn-construct-test-'));
    computeDir = path.join(tmpDir, 'default');
    fs.mkdirSync(computeDir, { recursive: true });
    fs.writeFileSync(
      path.join(computeDir, 'run.sh'),
      '#!/bin/bash\nexec node server.js',
    );
    fs.writeFileSync(path.join(computeDir, 'server.js'), '// server stub');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ---- Distribution basics ----

  void describe('distribution basics', () => {
    void it('creates a CloudFront distribution', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    });

    void it('configures HTTPS redirect on default behavior', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            DefaultCacheBehavior: Match.objectLike({
              ViewerProtocolPolicy: 'redirect-to-https',
            }),
          }),
        }),
      );
    });

    void it('sets TLS 1.2 minimum when custom domain is configured', () => {
      const stack = createEnvStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');
      const cert = Certificate.fromCertificateArn(
        stack,
        'Cert',
        'arn:aws:acm:us-east-1:123456789012:certificate/tls-test',
      );

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
        certificate: cert,
        domainName: 'www.example.com',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            ViewerCertificate: Match.objectLike({
              MinimumProtocolVersion: 'TLSv1.2_2021',
              SslSupportMethod: 'sni-only',
            }),
          }),
        }),
      );
    });

    void it('enables HTTP/2 and HTTP/3', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            HttpVersion: 'http2and3',
          }),
        }),
      );
    });
  });

  // ---- Build ID CloudFront Function ----

  void describe('Build ID CloudFront Function', () => {
    void it('creates a CloudFront Function', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::CloudFront::Function', 1);
    });

    void it('attaches Build ID function to viewer-request', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            DefaultCacheBehavior: Match.objectLike({
              FunctionAssociations: Match.arrayWith([
                Match.objectLike({
                  EventType: 'viewer-request',
                }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  // ---- SPA mode ----

  void describe('SPA mode', () => {
    void it('default behavior is S3 origin', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      // Default behavior uses cached methods (GET, HEAD, OPTIONS) — S3 pattern
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            DefaultCacheBehavior: Match.objectLike({
              AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
            }),
          }),
        }),
      );
    });

    void it('creates 403 → /index.html error response for SPA', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            CustomErrorResponses: Match.arrayWith([
              Match.objectLike({
                ErrorCode: 403,
                ResponseCode: 200,
                ResponsePagePath: `/builds/${spaManifest.buildId}/index.html`,
              }),
            ]),
          }),
        }),
      );
    });

    void it('creates 404 → /index.html error response for SPA', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            CustomErrorResponses: Match.arrayWith([
              Match.objectLike({
                ErrorCode: 404,
                ResponseCode: 200,
                ResponsePagePath: `/builds/${spaManifest.buildId}/index.html`,
              }),
            ]),
          }),
        }),
      );
    });
  });

  // ---- SSR mode ----

  void describe('SSR mode', () => {
    void it('default behavior routes to Lambda origin', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');
      const { fn, fnUrl } = createSsrFunction(stack, computeDir);

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: ssrManifest,
        securityHeadersPolicy: policy,
        ssrFunctionUrl: fnUrl,
        ssrFunction: fn,
      });

      const template = Template.fromStack(stack);
      // SSR default behavior uses ALL methods
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
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
        }),
      );
    });

    void it('creates additional static behaviors for non-catch-all routes', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');
      const { fn, fnUrl } = createSsrFunction(stack, computeDir);

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: ssrManifest,
        securityHeadersPolicy: policy,
        ssrFunctionUrl: fnUrl,
        ssrFunction: fn,
      });

      const template = Template.fromStack(stack);
      // Should have CacheBehaviors for /_next/static/* and /favicon.ico
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
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
        }),
      );
    });

    void it('creates SSR 5xx error responses (502, 503, 504)', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');
      const { fn, fnUrl } = createSsrFunction(stack, computeDir);

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: ssrManifest,
        securityHeadersPolicy: policy,
        ssrFunctionUrl: fnUrl,
        ssrFunction: fn,
      });

      const template = Template.fromStack(stack);
      for (const errorCode of [502, 503, 504]) {
        template.hasResourceProperties(
          'AWS::CloudFront::Distribution',
          Match.objectLike({
            DistributionConfig: Match.objectLike({
              CustomErrorResponses: Match.arrayWith([
                Match.objectLike({
                  ErrorCode: errorCode,
                  ResponsePagePath: `/builds/${ssrManifest.buildId}/_error.html`,
                }),
              ]),
            }),
          }),
        );
      }
    });

    void it('does not create SPA 403/404 error responses in SSR mode', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');
      const { fn, fnUrl } = createSsrFunction(stack, computeDir);

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: ssrManifest,
        securityHeadersPolicy: policy,
        ssrFunctionUrl: fnUrl,
        ssrFunction: fn,
      });

      const template = Template.fromStack(stack);
      const distributions = template.findResources(
        'AWS::CloudFront::Distribution',
      );
      const distribution = Object.values(distributions)[0] as Record<
        string,
        Record<string, unknown>
      >;
      const config = distribution.Properties.DistributionConfig as Record<
        string,
        unknown
      >;
      const errorResponses = config.CustomErrorResponses as Array<
        Record<string, unknown>
      >;

      const has403 = errorResponses?.some((r) => r.ErrorCode === 403);
      const has404 = errorResponses?.some((r) => r.ErrorCode === 404);

      assert.strictEqual(
        has403,
        false,
        'SSR should not have 403 error response',
      );
      assert.strictEqual(
        has404,
        false,
        'SSR should not have 404 error response',
      );
    });
  });

  // ---- Route mapping ----

  void describe('route mapping', () => {
    void it('maps compute routes to Lambda behavior', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');
      const { fn, fnUrl } = createSsrFunction(stack, computeDir);

      const manifest: DeployManifest = {
        version: 1,
        routes: [
          { path: '/api/*', target: { kind: 'Compute', src: 'default' } },
          { path: '/static/*', target: { kind: 'Static' } },
          { path: '/*', target: { kind: 'Compute', src: 'default' } },
        ],
        computeResources: [
          { name: 'default', runtime: 'nodejs20.x', entrypoint: 'run.sh' },
        ],
        framework: { name: 'nextjs' },
        buildId: 'test-routes-1',
      };

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest,
        securityHeadersPolicy: policy,
        ssrFunctionUrl: fnUrl,
        ssrFunction: fn,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            CacheBehaviors: Match.arrayWith([
              Match.objectLike({ PathPattern: '/api/*' }),
              Match.objectLike({ PathPattern: '/static/*' }),
            ]),
          }),
        }),
      );
    });
  });

  // ---- WAF association ----

  void describe('WAF association', () => {
    void it('associates WebACL when provided', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      const webAcl = new CfnWebACL(stack, 'WebAcl', {
        defaultAction: { allow: {} },
        scope: 'CLOUDFRONT',
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
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            WebACLId: Match.anyValue(),
          }),
        }),
      );
    });

    void it('does not associate WebACL when not provided', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      const distributions = template.findResources(
        'AWS::CloudFront::Distribution',
      );
      const distribution = Object.values(distributions)[0] as Record<
        string,
        Record<string, unknown>
      >;
      const config = distribution.Properties.DistributionConfig as Record<
        string,
        unknown
      >;
      assert.strictEqual(
        config.WebACLId,
        undefined,
        'Should not have WebACLId',
      );
    });
  });

  // ---- Access logging ----

  void describe('access logging', () => {
    void it('enables logging when accessLogBucket is provided', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const logBucket = new Bucket(stack, 'LogBucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
        accessLogBucket: logBucket,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            Logging: Match.objectLike({
              Bucket: Match.anyValue(),
            }),
          }),
        }),
      );
    });
  });

  // ---- Price class ----

  void describe('price class', () => {
    void it('uses PRICE_CLASS_100 by default', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            PriceClass: 'PriceClass_100',
          }),
        }),
      );
    });

    void it('applies custom priceClass', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
        priceClass: PriceClass.PRICE_CLASS_ALL,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            PriceClass: 'PriceClass_All',
          }),
        }),
      );
    });
  });

  // ---- OAC: S3 bucket policy ----

  void describe('OAC bucket policy', () => {
    void it('adds S3 GetObject policy for CloudFront', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

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
              Effect: 'Allow',
              Principal: {
                Service: 'cloudfront.amazonaws.com',
              },
            }),
          ]),
        }),
      });
    });
  });

  // ---- OAC: Lambda permission patch ----

  void describe('OAC Lambda permission patch', () => {
    void it('creates lambda:InvokeFunction permission for SSR', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');
      const { fn, fnUrl } = createSsrFunction(stack, computeDir);

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: ssrManifest,
        securityHeadersPolicy: policy,
        ssrFunctionUrl: fnUrl,
        ssrFunction: fn,
      });

      const template = Template.fromStack(stack);
      const permissions = template.findResources('AWS::Lambda::Permission');
      const invokePerms = Object.entries(permissions).filter(([, perm]) => {
        const props = (perm as Record<string, Record<string, unknown>>)
          .Properties;
        return props?.Action === 'lambda:InvokeFunction';
      });
      assert.ok(
        invokePerms.length > 0,
        'Should have lambda:InvokeFunction permission',
      );
    });
  });

  // ---- CloudFront behavior limit ----

  void describe('behavior limit', () => {
    void it('throws HostingError when more than 24 non-catch-all routes', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      // Create 25 non-catch-all routes (exceeds limit of 24)
      const routes: ManifestRoute[] = [];
      for (let i = 0; i < 25; i++) {
        routes.push({
          path: `/route-${i}`,
          target: { kind: 'Static' },
        });
      }
      routes.push({ path: '/*', target: { kind: 'Static' } });

      const manifest: DeployManifest = {
        version: 1,
        routes,
        framework: { name: 'spa' },
        buildId: 'test-limit-1',
      };

      assert.throws(
        () =>
          new CdnConstruct(stack, 'Cdn', {
            bucket,
            manifest,
            securityHeadersPolicy: policy,
          }),
        (err: unknown) => {
          assert.ok(err instanceof HostingError);
          assert.strictEqual(err.name, 'TooManyRoutesError');
          assert.ok(err.message.includes('25'));
          assert.ok(err.resolution);
          return true;
        },
      );
    });

    void it('accepts exactly 24 non-catch-all routes', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      const routes: ManifestRoute[] = [];
      for (let i = 0; i < 24; i++) {
        routes.push({
          path: `/route-${i}`,
          target: { kind: 'Static' },
        });
      }
      routes.push({ path: '/*', target: { kind: 'Static' } });

      const manifest: DeployManifest = {
        version: 1,
        routes,
        framework: { name: 'spa' },
        buildId: 'test-limit-ok',
      };

      const cdn = new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest,
        securityHeadersPolicy: policy,
      });
      assert.ok(cdn.distribution, 'Should create distribution with 24 routes');
    });
  });

  // ---- Custom domain on distribution ----

  void describe('custom domain', () => {
    void it('sets distributionUrl to custom domain when cert and domainName provided', () => {
      const stack = createEnvStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');
      const cert = Certificate.fromCertificateArn(
        stack,
        'Cert',
        'arn:aws:acm:us-east-1:123456789012:certificate/abc-123',
      );

      const cdn = new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
        certificate: cert,
        domainName: 'www.example.com',
      });

      assert.strictEqual(
        cdn.distributionUrl,
        'https://www.example.com',
        'distributionUrl should use custom domain',
      );
    });

    void it('sets distributionUrl to CloudFront domain when no custom domain', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      const cdn = new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      assert.ok(
        cdn.distributionUrl.startsWith('https://'),
        'distributionUrl should start with https://',
      );
    });

    void it('adds domain name as CloudFront alias', () => {
      const stack = createEnvStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');
      const cert = Certificate.fromCertificateArn(
        stack,
        'Cert',
        'arn:aws:acm:us-east-1:123456789012:certificate/abc-123',
      );

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
        certificate: cert,
        domainName: 'www.example.com',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties(
        'AWS::CloudFront::Distribution',
        Match.objectLike({
          DistributionConfig: Match.objectLike({
            Aliases: ['www.example.com'],
          }),
        }),
      );
    });
  });

  // ---- MissingBuildIdError ----

  void describe('MissingBuildIdError', () => {
    void it('throws HostingError with code MissingBuildIdError when buildId is undefined', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      const manifest: DeployManifest = {
        version: 1,
        routes: [{ path: '/*', target: { kind: 'Static' } }],
        framework: { name: 'spa' },
        // buildId intentionally omitted
      };

      assert.throws(
        () =>
          new CdnConstruct(stack, 'Cdn', {
            bucket,
            manifest,
            securityHeadersPolicy: policy,
          }),
        (err: unknown) => {
          assert.ok(err instanceof HostingError);
          assert.strictEqual(err.name, 'MissingBuildIdError');
          assert.ok(err.message.includes('buildId'));
          assert.ok(err.resolution);
          return true;
        },
      );
    });
  });

  // ---- CfnOutput ----

  void describe('outputs', () => {
    void it('creates DistributionUrl output', () => {
      const stack = createStack();
      const bucket = new Bucket(stack, 'Bucket');
      const policy = createSecurityHeadersPolicy(stack, 'Headers');

      new CdnConstruct(stack, 'Cdn', {
        bucket,
        manifest: spaManifest,
        securityHeadersPolicy: policy,
      });

      const template = Template.fromStack(stack);
      const outputs = template.findOutputs('*');
      const distUrlOutput = Object.entries(outputs).find(([key]) =>
        key.includes('DistributionUrl'),
      );
      assert.ok(distUrlOutput, 'Should have DistributionUrl output');
    });
  });
});
