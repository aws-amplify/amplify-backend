import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AmplifyHostingConstruct } from './hosting-construct.js';
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

  void it('creates Lambda function with Web Adapter configuration', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
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
            }),
          ]),
        }),
      }),
    );
  });

  void it('default behavior routes to Lambda (allows all HTTP methods)', () => {
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

  void it('does NOT create SPA error responses for SSR', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    const distributions = template.findResources(
      'AWS::CloudFront::Distribution',
    );
    for (const [, dist] of Object.entries(distributions)) {
      const config = (dist as Record<string, Record<string, unknown>>)
        .Properties?.DistributionConfig as Record<string, unknown>;
      assert.strictEqual(
        config?.CustomErrorResponses,
        undefined,
        'SSR mode should not have custom error responses',
      );
    }
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
});
