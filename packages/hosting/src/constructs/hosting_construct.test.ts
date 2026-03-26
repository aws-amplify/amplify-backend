import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AmplifyHostingConstruct } from './hosting_construct.js';
import { DeployManifest } from '../manifest/types.js';

// ---- Helpers ----

const createStack = (): Stack => {
  const app = new App();
  return new Stack(app, 'TestStack');
};

const spaManifest: DeployManifest = {
  version: 1,
  routes: [{ path: '/*', target: { kind: 'Static' } }],
  framework: { name: 'spa' },
  buildId: 'spa-test-1',
};

const ssrManifest: DeployManifest = {
  version: 1,
  routes: [
    {
      path: '/_next/static/*',
      target: {
        kind: 'Static',
        cacheControl: 'public, max-age=31536000, immutable',
      },
    },
    {
      path: '/favicon.ico',
      target: { kind: 'Static' },
    },
    {
      path: '/*',
      target: { kind: 'Compute', src: 'default' },
    },
  ],
  computeResources: [
    { name: 'default', runtime: 'nodejs20.x', entrypoint: 'run.sh' },
  ],
  framework: { name: 'nextjs', version: '15.0.0' },
  buildId: 'ssr-test-1',
};

// ================================================================
// SPA mode — static-only manifest
// ================================================================

void describe('AmplifyHostingConstruct — SPA mode', () => {
  let tmpDir: string;
  let staticDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-spa-test-'),
    );
    staticDir = path.join(tmpDir, 'static');
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('creates S3 bucket with BlockPublicAccess', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      VersioningConfiguration: {
        Status: 'Enabled',
      },
    });
  });

  void it('creates S3 lifecycle rule with 90-day expiration', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            ExpirationInDays: 90,
            Prefix: 'builds/',
            Status: 'Enabled',
          }),
        ]),
      },
    });
  });

  void it('creates CloudFront distribution with defaultRootObject', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          DefaultRootObject: 'index.html',
          HttpVersion: 'http2and3',
        }),
      }),
    );
  });

  void it('creates OAC (not OAI)', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties(
      'AWS::CloudFront::OriginAccessControl',
      Match.objectLike({
        OriginAccessControlConfig: Match.objectLike({
          OriginAccessControlOriginType: 's3',
          SigningBehavior: 'always',
          SigningProtocol: 'sigv4',
        }),
      }),
    );
  });

  void it('creates CloudFront Function for Build ID rewriting', () => {
    const stack = createStack();
    const buildId = 'atomic-test-42';
    const manifest: DeployManifest = {
      ...spaManifest,
      buildId,
    };

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties(
      'AWS::CloudFront::Function',
      Match.objectLike({
        FunctionCode: Match.stringLikeRegexp(`builds/${buildId}`),
      }),
    );
  });

  void it('creates SPA error responses (403/404 → index.html)', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
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
              ResponsePagePath: '/index.html',
            }),
            Match.objectLike({
              ErrorCode: 404,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
            }),
          ]),
        }),
      }),
    );
  });

  void it('does NOT have public bucket policy', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    const bucketPolicies = template.findResources('AWS::S3::BucketPolicy');
    for (const [, policy] of Object.entries(bucketPolicies)) {
      const policyDoc = (policy as Record<string, Record<string, unknown>>)
        .Properties?.PolicyDocument as Record<string, unknown[]> | undefined;
      if (policyDoc?.Statement) {
        for (const statement of policyDoc.Statement) {
          const stmtObj = statement as Record<string, unknown>;
          if (stmtObj.Effect === 'Allow' && stmtObj.Principal === '*') {
            assert.fail(
              'Bucket policy should not grant public access to "*"',
            );
          }
        }
      }
    }
  });

  void it('does NOT create ACM/Route53 resources without domain config', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    const acmCerts = template.findResources(
      'AWS::CertificateManager::Certificate',
    );
    assert.strictEqual(
      Object.keys(acmCerts).length,
      0,
      'Should have no ACM certificates without domain config',
    );

    const records = template.findResources('AWS::Route53::RecordSet');
    assert.strictEqual(
      Object.keys(records).length,
      0,
      'Should have no Route53 records without domain config',
    );
  });

  void it('does NOT create SSR Lambda or Function URL for SPA', () => {
    const stack = createStack();
    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    // No Function URLs (BucketDeployment creates helper Lambdas, which is fine)
    const fnUrls = template.findResources('AWS::Lambda::Url');
    assert.strictEqual(
      Object.keys(fnUrls).length,
      0,
      'SPA mode should not create Function URLs',
    );

    // Construct should not expose SSR function
    assert.strictEqual(
      construct.ssrFunction,
      undefined,
      'SPA mode should not expose ssrFunction',
    );
    assert.strictEqual(
      construct.functionUrl,
      undefined,
      'SPA mode should not expose functionUrl',
    );
  });

  void it('outputs the distribution URL', () => {
    const stack = createStack();
    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
    });

    assert.ok(construct.distributionUrl.startsWith('https://'));
  });

  void it('exposes hosting resources', () => {
    const stack = createStack();
    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
    });

    const resources = construct.getResources();
    assert.ok(resources.bucket);
    assert.ok(resources.distribution);
    assert.ok(resources.distributionUrl);
  });

  void it('deploys static assets with BucketDeployment', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    // BucketDeployment creates a Custom::CDKBucketDeployment resource
    const customResources = template.findResources(
      'Custom::CDKBucketDeployment',
    );
    assert.ok(
      Object.keys(customResources).length > 0,
      'Should have BucketDeployment custom resource',
    );
  });

  void it('enables compression on static behavior', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          DefaultCacheBehavior: Match.objectLike({
            Compress: true,
          }),
        }),
      }),
    );
  });

  void it('retains S3 bucket when retainOnDelete is true', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
      retainOnDelete: true,
    });

    const template = Template.fromStack(stack);

    const buckets = template.findResources('AWS::S3::Bucket');
    // Find the hosting bucket (not the autoDeleteObjects custom resource bucket)
    let foundRetain = false;
    for (const [, bucket] of Object.entries(buckets)) {
      const bucketObj = bucket as Record<string, unknown>;
      if (bucketObj.DeletionPolicy === 'Retain') {
        foundRetain = true;
      }
    }
    assert.ok(foundRetain, 'Bucket should have Retain deletion policy');
  });
});

// ================================================================
// SSR mode — manifest with compute routes
// ================================================================

void describe('AmplifyHostingConstruct — SSR mode', () => {
  let tmpDir: string;
  let staticDir: string;
  let computeDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-ssr-test-'),
    );
    staticDir = path.join(tmpDir, 'static');
    computeDir = path.join(tmpDir, 'compute');

    // Create mock static assets
    fs.mkdirSync(path.join(staticDir, '_next', 'static'), { recursive: true });
    fs.writeFileSync(
      path.join(staticDir, '_next', 'static', 'main.js'),
      'chunk',
    );

    // Create mock compute directory with server code
    const defaultDir = path.join(computeDir, 'default');
    fs.mkdirSync(defaultDir, { recursive: true });
    fs.writeFileSync(
      path.join(defaultDir, 'server.js'),
      'require("http").createServer().listen(3000)',
    );
    fs.writeFileSync(
      path.join(defaultDir, 'run.sh'),
      '#!/bin/bash\nexec node server.js',
    );
    fs.writeFileSync(
      path.join(defaultDir, 'index.js'),
      'exports.handler = async () => ({ statusCode: 502, body: "SSR bootstrap failed" });',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('creates S3 bucket with BlockPublicAccess (same as SPA)', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  void it('creates OAC for S3 origin', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties(
      'AWS::CloudFront::OriginAccessControl',
      Match.objectLike({
        OriginAccessControlConfig: Match.objectLike({
          SigningBehavior: 'always',
          SigningProtocol: 'sigv4',
        }),
      }),
    );
  });

  void it('creates Lambda function with index.handler and Web Adapter configuration', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      Handler: 'index.handler',
      MemorySize: 512,
      Timeout: 30,
      Environment: {
        Variables: Match.objectLike({
          AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
          AWS_LWA_INVOKE_MODE: 'response_stream',
          PORT: '3000',
        }),
      },
    });
  });

  void it('creates Lambda with explicit least-privilege role', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    // Verify IAM role with LambdaBasicExecutionRole managed policy
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: Match.objectLike({
              Service: 'lambda.amazonaws.com',
            }),
          }),
        ]),
      }),
      ManagedPolicyArns: Match.arrayWith([
        Match.objectLike({
          'Fn::Join': Match.anyValue(),
        }),
      ]),
    });
  });

  void it('creates Lambda with Web Adapter layer', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Layers: Match.anyValue(),
    });
  });

  void it('creates Function URL with RESPONSE_STREAM invoke mode', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Url', {
      AuthType: 'AWS_IAM',
      InvokeMode: 'RESPONSE_STREAM',
    });
  });

  void it('creates CloudFront distribution with additional cache behaviors', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          CacheBehaviors: Match.anyValue(),
        }),
      }),
    );
  });

  void it('routes /_next/static/* to S3 origin via cache behavior', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          CacheBehaviors: Match.arrayWith([
            Match.objectLike({
              PathPattern: '/_next/static/*',
              AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
              Compress: true,
            }),
          ]),
        }),
      }),
    );
  });

  void it('default behavior routes to Lambda (allows all HTTP methods) with compression', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          DefaultCacheBehavior: Match.objectLike({
            Compress: true,
            AllowedMethods: [
              'GET',
              'HEAD',
              'OPTIONS',
              'PUT',
              'PATCH',
              'POST',
              'DELETE',
            ],
          }),
        }),
      }),
    );
  });

  void it('does NOT set defaultRootObject for SSR', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    // SSR has Lambda handling /, so no DefaultRootObject
    const distributions = template.findResources(
      'AWS::CloudFront::Distribution',
    );
    for (const [, dist] of Object.entries(distributions)) {
      const config = (dist as Record<string, Record<string, unknown>>)
        .Properties?.DistributionConfig as Record<string, unknown>;
      assert.strictEqual(
        config?.DefaultRootObject,
        undefined,
        'SSR mode should not set DefaultRootObject',
      );
    }
  });

  void it('creates SSR 5xx error responses', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          CustomErrorResponses: Match.arrayWith([
            Match.objectLike({
              ErrorCode: 502,
              ResponsePagePath: '/_error.html',
            }),
            Match.objectLike({
              ErrorCode: 503,
              ResponsePagePath: '/_error.html',
            }),
          ]),
        }),
      }),
    );
  });

  void it('creates CloudFront Function for Build ID rewriting', () => {
    const stack = createStack();
    const buildId = 'ssr-atomic-42';
    const manifest: DeployManifest = {
      ...ssrManifest,
      buildId,
    };

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties(
      'AWS::CloudFront::Function',
      Match.objectLike({
        FunctionCode: Match.stringLikeRegexp(`builds/${buildId}`),
      }),
    );
  });

  void it('outputs the distribution URL', () => {
    const stack = createStack();
    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    assert.ok(construct.distributionUrl.startsWith('https://'));
  });

  void it('exposes SSR function and Function URL', () => {
    const stack = createStack();
    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    assert.ok(construct.ssrFunction, 'SSR mode should expose ssrFunction');
    assert.ok(construct.functionUrl, 'SSR mode should expose functionUrl');
  });

  void it('deploys static assets with BucketDeployment', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    const customResources = template.findResources(
      'Custom::CDKBucketDeployment',
    );
    assert.ok(
      Object.keys(customResources).length > 0,
      'Should have BucketDeployment custom resource',
    );
  });

  void it('uses custom compute config when provided', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
      compute: {
        memorySize: 1024,
        timeout: 60,
        reservedConcurrency: 50,
      },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      MemorySize: 1024,
      Timeout: 60,
      ReservedConcurrentExecutions: 50,
    });
  });
});

// ================================================================
// Security headers
// ================================================================

void describe('AmplifyHostingConstruct — security headers', () => {
  let tmpDir: string;
  let staticDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-headers-test-'),
    );
    staticDir = path.join(tmpDir, 'static');
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('creates ResponseHeadersPolicy with CSP', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties(
      'AWS::CloudFront::ResponseHeadersPolicy',
      Match.objectLike({
        ResponseHeadersPolicyConfig: Match.objectLike({
          SecurityHeadersConfig: Match.objectLike({
            ContentSecurityPolicy: Match.objectLike({
              ContentSecurityPolicy: Match.stringLikeRegexp("default-src 'self'"),
              Override: false,
            }),
          }),
        }),
      }),
    );
  });

  void it('sets override: true for HSTS, X-Content-Type, X-Frame-Options, XSS, Referrer', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties(
      'AWS::CloudFront::ResponseHeadersPolicy',
      Match.objectLike({
        ResponseHeadersPolicyConfig: Match.objectLike({
          SecurityHeadersConfig: Match.objectLike({
            StrictTransportSecurity: Match.objectLike({
              Override: true,
            }),
            ContentTypeOptions: Match.objectLike({
              Override: true,
            }),
            FrameOptions: Match.objectLike({
              Override: true,
            }),
            XSSProtection: Match.objectLike({
              Override: true,
            }),
            ReferrerPolicy: Match.objectLike({
              Override: true,
            }),
          }),
        }),
      }),
    );
  });
});

// ================================================================
// Custom domain configuration
// ================================================================

void describe('AmplifyHostingConstruct — custom domain', () => {
  let tmpDir: string;
  let staticDir: string;

  const spaManifestForDomain: DeployManifest = {
    version: 1,
    routes: [{ path: '/*', target: { kind: 'Static' } }],
    framework: { name: 'spa' },
    buildId: 'domain-test-1',
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-domain-test-'),
    );
    staticDir = path.join(tmpDir, 'static');
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // HostedZone.fromLookup requires env with account/region
  const createEnvStack = (): Stack => {
    const app = new App();
    return new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
  };

  void it('creates ACM certificate when domain is configured', () => {
    const stack = createEnvStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifestForDomain,
      staticAssetPath: staticDir,
      domain: { domainName: 'www.example.com', hostedZone: 'example.com' },
    });

    const template = Template.fromStack(stack);

    // DnsValidatedCertificate creates a custom resource for the cert
    const customResources = template.findResources(
      'AWS::CloudFormation::CustomResource',
    );
    const certResources = Object.entries(customResources).filter(
      ([, r]) => {
        const props = (r as Record<string, Record<string, unknown>>).Properties;
        return props?.DomainName === 'www.example.com';
      },
    );
    assert.ok(
      certResources.length > 0,
      'Should create a certificate custom resource for the domain',
    );
  });

  void it('adds alternate domain name to CloudFront distribution', () => {
    const stack = createEnvStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifestForDomain,
      staticAssetPath: staticDir,
      domain: { domainName: 'www.example.com', hostedZone: 'example.com' },
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

  void it('creates Route53 A record pointing to CloudFront', () => {
    const stack = createEnvStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifestForDomain,
      staticAssetPath: staticDir,
      domain: { domainName: 'www.example.com', hostedZone: 'example.com' },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Name: 'www.example.com.',
      Type: 'A',
    });
  });

  void it('outputs custom domain URL instead of CloudFront URL', () => {
    const stack = createEnvStack();
    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifestForDomain,
      staticAssetPath: staticDir,
      domain: { domainName: 'www.example.com', hostedZone: 'example.com' },
    });

    assert.strictEqual(construct.distributionUrl, 'https://www.example.com');
  });

  void it('exposes certificate and hostedZone on the construct', () => {
    const stack = createEnvStack();
    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifestForDomain,
      staticAssetPath: staticDir,
      domain: { domainName: 'www.example.com', hostedZone: 'example.com' },
    });

    assert.ok(construct.certificate, 'Should expose certificate');
    assert.ok(construct.hostedZone, 'Should expose hostedZone');
  });

  void it('throws when domain name does not match hosted zone', () => {
    const stack = createEnvStack();
    assert.throws(
      () =>
        new AmplifyHostingConstruct(stack, 'Hosting', {
          manifest: spaManifestForDomain,
          staticAssetPath: staticDir,
          domain: { domainName: 'app.other.com', hostedZone: 'example.com' },
        }),
      (error: Error) => {
        assert.ok(error.name === 'InvalidDomainConfigError');
        return true;
      },
    );
  });
});

// ================================================================
// WAF configuration
// ================================================================

void describe('AmplifyHostingConstruct — WAF', () => {
  let tmpDir: string;
  let staticDir: string;

  const spaManifestForWaf: DeployManifest = {
    version: 1,
    routes: [{ path: '/*', target: { kind: 'Static' } }],
    framework: { name: 'spa' },
    buildId: 'waf-test-1',
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-waf-test-'),
    );
    staticDir = path.join(tmpDir, 'static');
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const createStack = (): Stack => {
    const app = new App();
    return new Stack(app, 'TestStack');
  };

  void it('creates WAFv2 WebACL when waf.enabled is true', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifestForWaf,
      staticAssetPath: staticDir,
      waf: { enabled: true },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Scope: 'CLOUDFRONT',
      DefaultAction: { Allow: {} },
    });
  });

  void it('includes AWSManagedRulesCommonRuleSet', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifestForWaf,
      staticAssetPath: staticDir,
      waf: { enabled: true },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'AWSManagedRulesCommonRuleSet',
          Statement: {
            ManagedRuleGroupStatement: {
              VendorName: 'AWS',
              Name: 'AWSManagedRulesCommonRuleSet',
            },
          },
        }),
      ]),
    });
  });

  void it('includes AWSManagedRulesKnownBadInputsRuleSet', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifestForWaf,
      staticAssetPath: staticDir,
      waf: { enabled: true },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'AWSManagedRulesKnownBadInputsRuleSet',
          Statement: {
            ManagedRuleGroupStatement: {
              VendorName: 'AWS',
              Name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
        }),
      ]),
    });
  });

  void it('includes RateLimitRule', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifestForWaf,
      staticAssetPath: staticDir,
      waf: { enabled: true },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'RateLimitRule',
          Action: { Block: {} },
          Statement: {
            RateBasedStatement: {
              Limit: 1000,
              AggregateKeyType: 'IP',
            },
          },
        }),
      ]),
    });
  });

  void it('associates WebACL with CloudFront distribution', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifestForWaf,
      staticAssetPath: staticDir,
      waf: { enabled: true },
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

  void it('does NOT create WAF when waf.enabled is false', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifestForWaf,
      staticAssetPath: staticDir,
      waf: { enabled: false },
    });

    const template = Template.fromStack(stack);

    const webAcls = template.findResources('AWS::WAFv2::WebACL');
    assert.strictEqual(
      Object.keys(webAcls).length,
      0,
      'Should not create WebACL when waf.enabled is false',
    );
  });

  void it('does NOT create WAF when waf prop is omitted', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifestForWaf,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    const webAcls = template.findResources('AWS::WAFv2::WebACL');
    assert.strictEqual(
      Object.keys(webAcls).length,
      0,
      'Should not create WebACL when waf is omitted',
    );
  });

  void it('exposes webAcl on the construct when enabled', () => {
    const stack = createStack();
    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifestForWaf,
      staticAssetPath: staticDir,
      waf: { enabled: true },
    });

    assert.ok(construct.webAcl, 'Should expose webAcl when WAF is enabled');
  });

  void it('uses custom rateLimit when provided', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifestForWaf,
      staticAssetPath: staticDir,
      waf: { enabled: true, rateLimit: 5000 },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'RateLimitRule',
          Statement: {
            RateBasedStatement: {
              Limit: 5000,
              AggregateKeyType: 'IP',
            },
          },
        }),
      ]),
    });
  });
});

// ================================================================
// Access logging
// ================================================================

void describe('AmplifyHostingConstruct — access logging', () => {
  let tmpDir: string;
  let staticDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-logging-test-'),
    );
    staticDir = path.join(tmpDir, 'static');
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('creates log bucket when accessLogging is enabled', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
      accessLogging: true,
    });

    const template = Template.fromStack(stack);

    // Should have at least 2 buckets: hosting bucket + log bucket
    const buckets = template.findResources('AWS::S3::Bucket');
    assert.ok(
      Object.keys(buckets).length >= 2,
      `Should have at least 2 S3 buckets (hosting + log), got ${Object.keys(buckets).length}`,
    );
  });

  void it('does not create log bucket when accessLogging is not set', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    // Should have exactly 1 hosting bucket (autoDeleteObjects may create an additional resource)
    const buckets = template.findResources('AWS::S3::Bucket');
    assert.ok(
      Object.keys(buckets).length <= 1,
      `Should have at most 1 S3 bucket without logging, got ${Object.keys(buckets).length}`,
    );
  });
});

// ================================================================
// Custom Content-Security-Policy
// ================================================================

void describe('AmplifyHostingConstruct — custom CSP', () => {
  let tmpDir: string;
  let staticDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-csp-test-'),
    );
    staticDir = path.join(tmpDir, 'static');
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('uses custom CSP when provided', () => {
    const stack = createStack();
    const customCsp = "default-src 'none'; script-src 'self'";
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
      contentSecurityPolicy: customCsp,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties(
      'AWS::CloudFront::ResponseHeadersPolicy',
      Match.objectLike({
        ResponseHeadersPolicyConfig: Match.objectLike({
          SecurityHeadersConfig: Match.objectLike({
            ContentSecurityPolicy: Match.objectLike({
              ContentSecurityPolicy: customCsp,
            }),
          }),
        }),
      }),
    );
  });
});

// ================================================================
// S3 bucket lifecycle — noncurrent version expiration
// ================================================================

void describe('AmplifyHostingConstruct — S3 lifecycle', () => {
  let tmpDir: string;
  let staticDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-lifecycle-test-'),
    );
    staticDir = path.join(tmpDir, 'static');
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('includes NoncurrentVersionExpiration lifecycle rule', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    // Find the hosting bucket and verify lifecycle rules
    const buckets = template.findResources('AWS::S3::Bucket');
    const hostingBucketKey = Object.keys(buckets).find((key) => key.includes('HostingBucket'));
    assert.ok(hostingBucketKey, 'Should find HostingBucket resource');

    const props = (buckets[hostingBucketKey!] as Record<string, Record<string, unknown>>).Properties;
    const rules = (props?.LifecycleConfiguration as Record<string, unknown[]>)?.Rules;
    assert.ok(Array.isArray(rules), 'Should have lifecycle rules');

    const noncurrentRule = rules.find(
      // eslint-disable-next-line @typescript-eslint/naming-convention -- CDK CloudFormation property name
      (r: unknown) => (r as { Id?: string }).Id === 'ExpireNoncurrentVersions',
    );
    assert.ok(noncurrentRule, 'Should have ExpireNoncurrentVersions rule');
    assert.ok(
      (noncurrentRule as Record<string, unknown>).NoncurrentVersionExpiration,
      'Rule should have NoncurrentVersionExpiration',
    );
  });
});
