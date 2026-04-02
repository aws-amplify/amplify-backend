import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AmplifyHostingConstruct } from './hosting_construct.js';
import { HostingError } from '../hosting_error.js';
import { DeployManifest } from '../manifest/types.js';

// ================================================================
// Vanilla CDK project integration
//
// These tests simulate what a CDK user would do:
//   import { AmplifyHostingConstruct } from '@aws-amplify/hosting/constructs'
//   new AmplifyHostingConstruct(stack, 'MyHosting', { ... })
//
// No defineHosting(), no factory.ts, no Amplify CLI.
// ================================================================

void describe('Vanilla CDK project integration', () => {
  let tmpDir: string;
  let staticDir: string;
  let computeDir: string;

  const createTestSpaManifest = (
    buildId = 'vanilla-spa-1',
  ): DeployManifest => ({
    version: 1,
    routes: [{ path: '/*', target: { kind: 'Static' } }],
    framework: { name: 'spa' },
    buildId,
  });

  const createTestSsrManifest = (
    buildId = 'vanilla-ssr-1',
  ): DeployManifest => ({
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
        path: '/*',
        target: { kind: 'Compute', src: 'default' },
      },
    ],
    computeResources: [
      { name: 'default', runtime: 'nodejs20.x', entrypoint: 'run.sh' },
    ],
    framework: { name: 'nextjs', version: '15.0.0' },
    buildId,
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-vanilla-cdk-test-'),
    );
    staticDir = path.join(tmpDir, 'static');
    computeDir = path.join(tmpDir, 'compute');

    // SPA static assets
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
    fs.writeFileSync(
      path.join(staticDir, 'style.css'),
      'body { color: #333; }',
    );

    // SSR compute assets
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
      'exports.handler = async () => ({ statusCode: 502 });',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('produces valid CloudFormation when used like a normal CDK L3 construct', () => {
    const app = new App();
    const stack = new Stack(app, 'VanillaCdkStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    new AmplifyHostingConstruct(stack, 'MyHosting', {
      manifest: createTestSpaManifest(),
      staticAssetPath: staticDir,
      contentSecurityPolicy: "default-src 'self'",
      waf: { enabled: true },
    });

    // Full synth — proves no Amplify runtime dependencies needed
    const template = Template.fromStack(stack);

    // Verify it produces a complete template ready to deploy
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.resourceCountIs('AWS::WAFv2::WebACL', 1);

    // S3 buckets exist
    const buckets = template.findResources('AWS::S3::Bucket');
    assert.ok(
      Object.keys(buckets).length >= 1,
      'Should have at least one S3 bucket',
    );

    // Verify NO Amplify-specific SSM parameters
    template.resourceCountIs('AWS::SSM::Parameter', 0);
  });

  void it('works with SSR (Next.js) configuration', () => {
    const app = new App();
    const stack = new Stack(app, 'VanillaSsrStack');

    new AmplifyHostingConstruct(stack, 'MyHosting', {
      manifest: createTestSsrManifest(),
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
    });

    const template = Template.fromStack(stack);

    // CloudFront distribution
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);

    // Lambda function for SSR
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      Handler: 'run.sh',
    });

    // Function URL
    template.hasResourceProperties('AWS::Lambda::Url', {
      AuthType: 'AWS_IAM',
      InvokeMode: 'RESPONSE_STREAM',
    });

    // No SSM parameters (Amplify-specific)
    template.resourceCountIs('AWS::SSM::Parameter', 0);
  });

  void it('throws HostingError (not AmplifyUserError) on invalid config', () => {
    assert.throws(
      () => {
        const app = new App();
        const stack = new Stack(app, 'InvalidStack');
        new AmplifyHostingConstruct(stack, 'MyHosting', {
          manifest: {
            ...createTestSpaManifest(),
            buildId: 'has spaces and !!! invalid chars',
          },
          staticAssetPath: staticDir,
        });
      },
      (err: unknown) => {
        assert.ok(
          err instanceof HostingError,
          `Expected HostingError, got ${(err as Error).constructor.name}`,
        );
        return true;
      },
    );
  });

  void it('supports custom CSP header', () => {
    const app = new App();
    const stack = new Stack(app, 'CspStack');
    const customCsp = "default-src 'self'; script-src 'none'";

    new AmplifyHostingConstruct(stack, 'MyHosting', {
      manifest: createTestSpaManifest(),
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

  void it('creates access log bucket when accessLogging is enabled', () => {
    const app = new App();
    const stack = new Stack(app, 'LogStack');

    new AmplifyHostingConstruct(stack, 'MyHosting', {
      manifest: createTestSpaManifest(),
      staticAssetPath: staticDir,
      accessLogging: true,
    });

    const template = Template.fromStack(stack);

    // Should have at least 2 buckets: hosting + access log
    const buckets = template.findResources('AWS::S3::Bucket');
    const logBucket = Object.entries(buckets).find(([key]) =>
      key.includes('AccessLogBucket'),
    );
    assert.ok(logBucket, 'Should create an AccessLogBucket');
  });

  void it('retains bucket when retainOnDelete is true', () => {
    const app = new App();
    const stack = new Stack(app, 'RetainStack');

    new AmplifyHostingConstruct(stack, 'MyHosting', {
      manifest: createTestSpaManifest(),
      staticAssetPath: staticDir,
      retainOnDelete: true,
    });

    const template = Template.fromStack(stack);
    const buckets = template.findResources('AWS::S3::Bucket');

    let foundRetain = false;
    for (const [, bucket] of Object.entries(buckets)) {
      if ((bucket as Record<string, unknown>).DeletionPolicy === 'Retain') {
        foundRetain = true;
      }
    }
    assert.ok(foundRetain, 'At least one bucket should have Retain policy');
  });

  void it('uses custom compute config for SSR', () => {
    const app = new App();
    const stack = new Stack(app, 'ComputeStack');

    new AmplifyHostingConstruct(stack, 'MyHosting', {
      manifest: createTestSsrManifest(),
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
      compute: {
        memorySize: 2048,
        timeout: 120,
        reservedConcurrency: 100,
      },
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      MemorySize: 2048,
      Timeout: 120,
      ReservedConcurrentExecutions: 100,
    });
  });

  void it('constructs can be composed with other CDK resources', () => {
    // This test proves that the construct output can be referenced by
    // other CDK constructs — a key use case for vanilla CDK users.
    const app = new App();
    const stack = new Stack(app, 'ComposedStack');

    const hosting = new AmplifyHostingConstruct(stack, 'MyHosting', {
      manifest: createTestSpaManifest(),
      staticAssetPath: staticDir,
    });

    // Verify the construct exposes usable CDK resources
    assert.ok(hosting.bucket.bucketName, 'Bucket should have a name');
    assert.ok(
      hosting.distribution.distributionId,
      'Distribution should have an ID',
    );
    assert.ok(
      hosting.distributionUrl.startsWith('https://'),
      'Should have a valid URL',
    );
  });
});
