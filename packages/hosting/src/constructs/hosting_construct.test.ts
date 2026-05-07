import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { AmplifyHostingConstruct } from './hosting_construct.js';
import { DeployManifest } from '../manifest/types.js';
import { HostingError } from '../hosting_error.js';

// ---- Helpers ----

const createStack = (): Stack => {
  const app = new App();
  return new Stack(app, 'TestStack');
};

let tmpDir: string;

const createStaticDir = (): string => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-test-'));
  fs.writeFileSync(path.join(tmpDir, 'index.html'), '<html></html>');
  return tmpDir;
};

const createBundleDir = (): string => {
  const dir = path.join(tmpDir, 'bundle');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'index.mjs'),
    'export const handler = async () => {};',
  );
  return dir;
};

const spaManifest = (staticDir: string): DeployManifest => ({
  version: 1,
  compute: {},
  staticAssets: { directory: staticDir },
  routes: [{ pattern: '/*', target: 'static' }],
  buildId: 'spa-test-1',
});

const ssrManifest = (staticDir: string, bundleDir: string): DeployManifest => ({
  version: 1,
  compute: {
    default: {
      type: 'handler',
      bundle: bundleDir,
      handler: 'index.handler',
      placement: 'regional',
      streaming: true,
      runtime: 'nodejs20.x',
    },
  },
  staticAssets: { directory: staticDir },
  routes: [
    { pattern: '/_next/static/*', target: 'static' },
    { pattern: '/favicon.ico', target: 'static' },
    { pattern: '/*', target: 'default' },
  ],
  buildId: 'ssr-test-1',
});

// ================================================================
// SPA mode
// ================================================================

void describe('AmplifyHostingConstruct — SPA mode', () => {
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('creates S3 bucket with BlockPublicAccess', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: Match.objectLike({
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
      }),
    });
  });

  void it('creates CloudFront distribution', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
  });

  void it('exposes bucket, distribution, and distributionUrl', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
    });

    assert.ok(construct.bucket);
    assert.ok(construct.distribution);
    assert.ok(construct.distributionUrl);
  });

  void it('does not create user Lambda when no compute in manifest', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
    });

    const template = Template.fromStack(stack);
    // BucketDeployment creates its own Lambda, so check for Lambda URL instead
    // A user SSR Lambda would have a Function URL resource
    template.resourceCountIs('AWS::Lambda::Url', 0);
  });
});

// ================================================================
// SSR mode
// ================================================================

void describe('AmplifyHostingConstruct — SSR mode', () => {
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('creates Lambda function for handler compute type', () => {
    const staticDir = createStaticDir();
    const bundleDir = createBundleDir();
    const stack = createStack();

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest(staticDir, bundleDir),
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      Handler: 'index.handler',
    });
  });

  void it('creates Lambda Function URL with IAM auth', () => {
    const staticDir = createStaticDir();
    const bundleDir = createBundleDir();
    const stack = createStack();

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest(staticDir, bundleDir),
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Url', {
      AuthType: 'AWS_IAM',
    });
  });

  void it('supports http-server compute type with Web Adapter', () => {
    const staticDir = createStaticDir();
    const bundleDir = createBundleDir();
    fs.writeFileSync(path.join(bundleDir, 'server.js'), '// http server');
    const stack = createStack();

    const manifest: DeployManifest = {
      version: 1,
      compute: {
        default: {
          type: 'http-server',
          bundle: bundleDir,
          entrypoint: 'server.js',
          port: 3000,
          placement: 'regional',
          runtime: 'nodejs20.x',
        },
      },
      staticAssets: { directory: staticDir },
      routes: [{ pattern: '/*', target: 'default' }],
      buildId: 'ssr-http-1',
    };

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'server.js',
      Environment: {
        Variables: Match.objectLike({
          AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
          PORT: '3000',
        }),
      },
    });
  });
});

// ================================================================
// Cache infrastructure (ISR)
// ================================================================

void describe('AmplifyHostingConstruct — Cache/ISR', () => {
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('provisions DynamoDB table when cache.tagRevalidation is true', () => {
    const staticDir = createStaticDir();
    const bundleDir = createBundleDir();
    const stack = createStack();

    const manifest: DeployManifest = {
      ...ssrManifest(staticDir, bundleDir),
      cache: {
        computeResource: 'default',
        tagRevalidation: true,
        revalidationQueue: false,
      },
    };

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: Match.arrayWith([
        Match.objectLike({ AttributeName: 'tag', KeyType: 'HASH' }),
        Match.objectLike({ AttributeName: 'path', KeyType: 'RANGE' }),
      ]),
    });
  });

  void it('provisions SQS queue when cache.revalidationQueue is true', () => {
    const staticDir = createStaticDir();
    const bundleDir = createBundleDir();
    const stack = createStack();

    const manifest: DeployManifest = {
      ...ssrManifest(staticDir, bundleDir),
      cache: {
        computeResource: 'default',
        tagRevalidation: false,
        revalidationQueue: true,
      },
    };

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::SQS::Queue', 2); // Revalidation + DLQ
  });

  void it('provisions S3 cache bucket when cache is configured', () => {
    const staticDir = createStaticDir();
    const bundleDir = createBundleDir();
    const stack = createStack();

    const manifest: DeployManifest = {
      ...ssrManifest(staticDir, bundleDir),
      cache: {
        computeResource: 'default',
        tagRevalidation: true,
        revalidationQueue: true,
      },
    };

    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      skipRegionValidation: true,
    });

    assert.ok(construct.cacheBucket, 'Should provision cache bucket');
    assert.ok(construct.cacheTable, 'Should provision cache table');
    assert.ok(
      construct.revalidationQueue,
      'Should provision revalidation queue',
    );
  });

  void it('does not provision cache resources when no cache in manifest', () => {
    const staticDir = createStaticDir();
    const bundleDir = createBundleDir();
    const stack = createStack();

    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest(staticDir, bundleDir),
      skipRegionValidation: true,
    });

    assert.strictEqual(construct.cacheBucket, undefined);
    assert.strictEqual(construct.cacheTable, undefined);
    assert.strictEqual(construct.revalidationQueue, undefined);
  });
});

// ================================================================
// Image optimization
// ================================================================

void describe('AmplifyHostingConstruct — Image optimization', () => {
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('creates separate image optimization Lambda', () => {
    const staticDir = createStaticDir();
    const bundleDir = createBundleDir();
    const imgDir = path.join(tmpDir, 'image-fn');
    fs.mkdirSync(imgDir, { recursive: true });
    fs.writeFileSync(
      path.join(imgDir, 'index.mjs'),
      'export const handler = async () => {};',
    );

    const stack = createStack();

    const manifest: DeployManifest = {
      ...ssrManifest(staticDir, bundleDir),
      imageOptimization: {
        bundle: imgDir,
        handler: 'index.handler',
        formats: ['webp', 'avif'],
        sizes: [640, 1080],
      },
    };

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);
    // Should have at least 2 Lambda functions (default + image optimization)
    const functions = template.findResources('AWS::Lambda::Function');
    assert.ok(
      Object.keys(functions).length >= 2,
      `Expected at least 2 Lambda functions, got ${Object.keys(functions).length}`,
    );
  });
});

// ================================================================
// getResources
// ================================================================

void describe('AmplifyHostingConstruct — getResources', () => {
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('returns bucket, distribution, and distributionUrl', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
    });

    const resources = construct.getResources();
    assert.ok(resources.bucket);
    assert.ok(resources.distribution);
    assert.ok(resources.distributionUrl);
  });
});

// ================================================================
// Multi-compute
// ================================================================

void describe('AmplifyHostingConstruct — Multi-compute', () => {
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('creates separate Lambda and Function URL for each compute target', () => {
    const staticDir = createStaticDir();
    const bundleDir = createBundleDir();
    const apiBundleDir = path.join(tmpDir, 'api-bundle');
    fs.mkdirSync(apiBundleDir, { recursive: true });
    fs.writeFileSync(
      path.join(apiBundleDir, 'index.mjs'),
      'export const handler = async () => {};',
    );

    const stack = createStack();

    const manifest: DeployManifest = {
      version: 1,
      compute: {
        default: {
          type: 'handler',
          bundle: bundleDir,
          handler: 'index.handler',
          placement: 'regional',
          streaming: true,
          runtime: 'nodejs20.x',
        },
        api: {
          type: 'handler',
          bundle: apiBundleDir,
          handler: 'index.handler',
          placement: 'regional',
          streaming: false,
          runtime: 'nodejs20.x',
        },
      },
      staticAssets: { directory: staticDir },
      routes: [
        { pattern: '/_next/static/*', target: 'static' },
        { pattern: '/api/*', target: 'api' },
        { pattern: '/*', target: 'default' },
      ],
      buildId: 'multi-compute-1',
    };

    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      skipRegionValidation: true,
    });

    // Each compute target gets its own Lambda
    assert.ok(
      construct.computeFunctions.has('default'),
      'Should have default compute function',
    );
    assert.ok(
      construct.computeFunctions.has('api'),
      'Should have api compute function',
    );
    assert.strictEqual(
      construct.computeFunctions.size,
      2,
      'Should have exactly 2 compute functions',
    );

    // Each compute target gets its own Function URL
    assert.ok(
      construct.computeFunctionUrls.has('default'),
      'Should have default Function URL',
    );
    assert.ok(
      construct.computeFunctionUrls.has('api'),
      'Should have api Function URL',
    );
    assert.strictEqual(
      construct.computeFunctionUrls.size,
      2,
      'Should have exactly 2 Function URLs',
    );

    // OAC permissions: should have Lambda permissions for each function
    const template = Template.fromStack(stack);
    const permissions = template.findResources('AWS::Lambda::Permission');
    const invokeUrlPermissions = Object.values(permissions).filter(
      /* eslint-disable @typescript-eslint/naming-convention */
      (p: Record<string, unknown>) =>
        (p as { Properties?: { Action?: string } }).Properties?.Action ===
        'lambda:InvokeFunctionUrl',
      /* eslint-enable @typescript-eslint/naming-convention */
    );
    assert.ok(
      invokeUrlPermissions.length >= 2,
      `Expected at least 2 InvokeFunctionUrl permissions, got ${invokeUrlPermissions.length}`,
    );
  });
});

// ================================================================
// WAF Integration (hosted construct level)
// ================================================================

void describe('AmplifyHostingConstruct — WAF integration', () => {
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('creates WebACL and associates with CloudFront when waf.enabled is true', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
      waf: { enabled: true },
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::WAFv2::WebACL', 1);
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        WebACLId: Match.anyValue(),
      }),
    });
  });

  void it('does NOT create WebACL when waf is omitted', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::WAFv2::WebACL', 0);
  });

  void it('does NOT create WebACL when waf.enabled is false', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
      waf: { enabled: false },
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::WAFv2::WebACL', 0);
  });

  void it('applies custom rate limit to WAF', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
      waf: { enabled: true, rateLimit: 500 },
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'RateLimitRule',
          Statement: {
            RateBasedStatement: {
              Limit: 500,
              AggregateKeyType: 'IP',
            },
          },
        }),
      ]),
    });
  });

  void it('includes AWS managed rule groups in WAF', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
      waf: { enabled: true },
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Rules: Match.arrayWith([
        Match.objectLike({
          Name: 'AWSManagedRulesCommonRuleSet',
        }),
        Match.objectLike({
          Name: 'AWSManagedRulesKnownBadInputsRuleSet',
        }),
      ]),
    });
  });

  void it('WebACL has CLOUDFRONT scope', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
      waf: { enabled: true },
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Scope: 'CLOUDFRONT',
    });
  });
});

// ================================================================
// Domain / Custom Domain (hosted construct level)
// ================================================================

void describe('AmplifyHostingConstruct — Custom domain integration', () => {
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('creates Route53 records and ACM certificate for custom domain', () => {
    const staticDir = createStaticDir();
    const app = new App();
    const stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
      domain: {
        domainName: 'www.example.com',
        hostedZone: 'example.com',
      },
    });

    const template = Template.fromStack(stack);

    // Should have A and AAAA records
    const records = template.findResources('AWS::Route53::RecordSet');
    const recordTypes = Object.values(records).map(
      (r) => (r as Record<string, Record<string, unknown>>).Properties?.Type,
    );
    assert.ok(recordTypes.includes('A'), 'Should have an A record');
    assert.ok(recordTypes.includes('AAAA'), 'Should have an AAAA record');

    // Distribution should have domain alias
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: ['www.example.com'],
      }),
    });
  });

  void it('uses BYO certificate when certificateArn is provided', () => {
    const staticDir = createStaticDir();
    const app = new App();
    const stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    const cert = Certificate.fromCertificateArn(
      stack,
      'ImportedCert',
      'arn:aws:acm:us-east-1:123456789012:certificate/abc-123',
    );

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
      domain: {
        domainName: 'www.example.com',
        hostedZone: 'example.com',
        certificate: cert,
      },
    });

    const template = Template.fromStack(stack);

    // Should NOT create DnsValidatedCertificate custom resource
    const customResources = template.findResources(
      'AWS::CloudFormation::CustomResource',
    );
    const certResources = Object.entries(customResources).filter(([, r]) => {
      const props = (r as Record<string, Record<string, unknown>>).Properties;
      return props?.DomainName === 'www.example.com';
    });
    assert.strictEqual(
      certResources.length,
      0,
      'Should NOT create DnsValidatedCertificate when BYO cert is provided',
    );

    // Distribution should still have alias
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: ['www.example.com'],
      }),
    });
  });

  void it('rejects invalid domain not within hosted zone', () => {
    const staticDir = createStaticDir();
    const app = new App();
    const stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    assert.throws(
      () =>
        new AmplifyHostingConstruct(stack, 'Hosting', {
          manifest: spaManifest(staticDir),
          domain: {
            domainName: 'evil.other.com',
            hostedZone: 'example.com',
          },
        }),
      (err: unknown) => {
        assert.ok(err instanceof HostingError);
        assert.strictEqual(err.name, 'InvalidDomainConfigError');
        return true;
      },
    );
  });

  void it('rejects suffix-attack domain name', () => {
    const staticDir = createStaticDir();
    const app = new App();
    const stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    assert.throws(
      () =>
        new AmplifyHostingConstruct(stack, 'Hosting', {
          manifest: spaManifest(staticDir),
          domain: {
            domainName: 'evilexample.com',
            hostedZone: 'example.com',
          },
        }),
      (err: unknown) => {
        assert.ok(err instanceof HostingError);
        assert.strictEqual(err.name, 'InvalidDomainConfigError');
        return true;
      },
    );
  });
});

// ================================================================
// Error Paths
// ================================================================

void describe('AmplifyHostingConstruct — Error paths', () => {
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('throws CacheComputeResourceNotFoundError when cache references non-existent compute', () => {
    const staticDir = createStaticDir();
    const bundleDir = createBundleDir();
    const stack = createStack();

    const manifest: DeployManifest = {
      ...ssrManifest(staticDir, bundleDir),
      cache: {
        computeResource: 'nonexistent',
        tagRevalidation: true,
        revalidationQueue: true,
      },
    };

    assert.throws(
      () =>
        new AmplifyHostingConstruct(stack, 'Hosting', {
          manifest,
          skipRegionValidation: true,
        }),
      (err: unknown) => {
        assert.ok(err instanceof HostingError);
        assert.strictEqual(err.name, 'CacheComputeResourceNotFoundError');
        assert.ok(err.message.includes('nonexistent'));
        assert.ok(err.resolution);
        return true;
      },
    );
  });

  void it('throws InvalidWafConfigError when rate limit is below 100', () => {
    const staticDir = createStaticDir();
    const stack = createStack();

    assert.throws(
      () =>
        new AmplifyHostingConstruct(stack, 'Hosting', {
          manifest: spaManifest(staticDir),
          waf: { enabled: true, rateLimit: 50 },
          skipRegionValidation: true,
        }),
      (err: unknown) => {
        assert.ok(err instanceof HostingError);
        assert.strictEqual(err.name, 'InvalidWafConfigError');
        return true;
      },
    );
  });

  void it('throws InvalidCertificateRegionError for non-us-east-1 cert', () => {
    const staticDir = createStaticDir();
    const app = new App();
    const stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    const badCert = Certificate.fromCertificateArn(
      stack,
      'BadCert',
      'arn:aws:acm:eu-west-1:123456789012:certificate/bad-cert',
    );

    assert.throws(
      () =>
        new AmplifyHostingConstruct(stack, 'Hosting', {
          manifest: spaManifest(staticDir),
          domain: {
            domainName: 'www.example.com',
            hostedZone: 'example.com',
            certificate: badCert,
          },
        }),
      (err: unknown) => {
        assert.ok(err instanceof HostingError);
        assert.strictEqual(err.name, 'InvalidCertificateRegionError');
        return true;
      },
    );
  });

  void it('creates cache infrastructure when manifest.cache is present', () => {
    const staticDir = createStaticDir();
    const bundleDir = createBundleDir();
    const stack = createStack();

    const manifest: DeployManifest = {
      ...ssrManifest(staticDir, bundleDir),
      cache: {
        computeResource: 'default',
        tagRevalidation: true,
        revalidationQueue: true,
      },
    };

    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest,
      skipRegionValidation: true,
    });

    assert.ok(construct.cacheBucket, 'Should have cacheBucket');
    assert.ok(construct.cacheTable, 'Should have cacheTable');
    assert.ok(construct.revalidationQueue, 'Should have revalidationQueue');

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: Match.arrayWith([
        Match.objectLike({ AttributeName: 'tag', KeyType: 'HASH' }),
        Match.objectLike({ AttributeName: 'path', KeyType: 'RANGE' }),
      ]),
    });
    template.hasResourceProperties('AWS::SQS::Queue', {
      VisibilityTimeout: 30,
    });
  });

  void it('does not create cache infrastructure when manifest.cache is absent', () => {
    const staticDir = createStaticDir();
    const bundleDir = createBundleDir();
    const stack = createStack();

    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest(staticDir, bundleDir),
      skipRegionValidation: true,
    });

    assert.strictEqual(construct.cacheBucket, undefined);
    assert.strictEqual(construct.cacheTable, undefined);
    assert.strictEqual(construct.revalidationQueue, undefined);
  });
});

// ================================================================
// CSP / Security Headers (via hosting construct)
// ================================================================

void describe('AmplifyHostingConstruct — CSP / Security Headers', () => {
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('creates ResponseHeadersPolicy with default CSP when cdn.contentSecurityPolicy is not set', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties(
      'AWS::CloudFront::ResponseHeadersPolicy',
      Match.objectLike({
        ResponseHeadersPolicyConfig: Match.objectLike({
          SecurityHeadersConfig: Match.objectLike({
            ContentSecurityPolicy: Match.objectLike({
              ContentSecurityPolicy:
                Match.stringLikeRegexp("default-src 'self'"),
            }),
          }),
        }),
      }),
    );
  });

  void it('uses custom CSP when cdn.contentSecurityPolicy is provided', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    const customCsp = "default-src 'none'; script-src 'self'";
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
      cdn: { contentSecurityPolicy: customCsp },
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

  void it('includes HSTS headers', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties(
      'AWS::CloudFront::ResponseHeadersPolicy',
      Match.objectLike({
        ResponseHeadersPolicyConfig: Match.objectLike({
          SecurityHeadersConfig: Match.objectLike({
            StrictTransportSecurity: Match.objectLike({
              IncludeSubdomains: true,
              Preload: true,
              Override: true,
            }),
          }),
        }),
      }),
    );
  });
});

// ================================================================
// CDN Edge Cases (via hosting construct)
// ================================================================

void describe('AmplifyHostingConstruct — CDN edge cases', () => {
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('supports static-only mode (no compute functions)', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    const construct = new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
    });

    assert.strictEqual(
      construct.computeFunctions.size,
      0,
      'Should have no compute functions for SPA',
    );
    assert.strictEqual(
      construct.computeFunctionUrls.size,
      0,
      'Should have no compute function URLs for SPA',
    );

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        HttpVersion: 'http2and3',
      }),
    });
  });

  void it('sets TLS minimum protocol version to TLSv1.2_2021 with custom domain', () => {
    const staticDir = createStaticDir();
    const app = new App();
    const stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    const cert = Certificate.fromCertificateArn(
      stack,
      'TlsCert',
      'arn:aws:acm:us-east-1:123456789012:certificate/tls-test',
    );

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
      domain: {
        domainName: 'tls.example.com',
        hostedZone: 'example.com',
        certificate: cert,
      },
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

  void it('configures custom error pages for SPA (403/404 → index.html)', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
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

  void it('configures 5xx error pages for SSR mode', () => {
    const staticDir = createStaticDir();
    const bundleDir = createBundleDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest(staticDir, bundleDir),
      skipRegionValidation: true,
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

  void it('adds OAC S3 bucket policy for CloudFront access', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
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

  void it('supports geo-restriction via cdn prop', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
      cdn: {
        geoRestriction: { type: 'whitelist', countries: ['US', 'CA'] },
      },
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

  void it('uses default price class PRICE_CLASS_100', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        PriceClass: 'PriceClass_100',
      }),
    });
  });
});

// ================================================================
// Storage (via hosting construct)
// ================================================================

void describe('AmplifyHostingConstruct — Storage', () => {
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('creates bucket with lifecycle rules', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: Match.objectLike({
        Rules: Match.arrayWith([
          Match.objectLike({
            Id: 'DeleteOldBuilds',
            Prefix: 'builds/',
            Status: 'Enabled',
          }),
          Match.objectLike({
            Id: 'ExpireNoncurrentVersions',
            Status: 'Enabled',
          }),
        ]),
      }),
    });
  });

  void it('creates bucket with BlockPublicAccess BLOCK_ALL', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: Match.objectLike({
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      }),
    });
  });

  void it('uses S3_MANAGED encryption by default', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
    });
  });

  void it('uses KMS encryption when storage.encryption is KMS', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
      storage: { encryption: 'KMS' },
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: Match.objectLike({
              SSEAlgorithm: 'aws:kms',
            }),
          },
        ],
      },
    });
  });

  void it('creates access log bucket when logging.enabled is true', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
      logging: { enabled: true },
    });

    const template = Template.fromStack(stack);
    // Should have logging enabled on distribution
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Logging: Match.anyValue(),
      }),
    });
  });
});

// ================================================================
// KMS Key Policy Grants
// ================================================================

void describe('AmplifyHostingConstruct — KMS Key Policy', () => {
  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('creates KMS key when storage.encryption is KMS', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
      storage: { encryption: 'KMS' },
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::KMS::Key', 1);
  });

  void it('KMS key policy grants kms:Decrypt to cloudfront.amazonaws.com', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
      storage: { encryption: 'KMS' },
    });

    const template = Template.fromStack(stack);
    const keys = template.findResources('AWS::KMS::Key');
    assert.ok(Object.keys(keys).length > 0, 'Should have at least one KMS key');

    const keyResource = Object.values(keys)[0] as Record<
      string,
      Record<string, unknown>
    >;
    const keyPolicy = keyResource.Properties.KeyPolicy as Record<
      string,
      unknown
    >;
    const statements = keyPolicy['Statement'] as Array<Record<string, unknown>>;

    // Find the CloudFront decrypt statement
    const cfDecryptStatement = statements.find((stmt) => {
      const actions = stmt.Action;
      const principal = stmt.Principal as Record<string, unknown> | undefined;
      const service = principal?.Service;
      const hasDecrypt = Array.isArray(actions)
        ? actions.includes('kms:Decrypt')
        : actions === 'kms:Decrypt';
      const isCfPrincipal =
        service === 'cloudfront.amazonaws.com' ||
        (Array.isArray(service) &&
          service.includes('cloudfront.amazonaws.com'));
      return hasDecrypt && isCfPrincipal;
    });

    assert.ok(
      cfDecryptStatement,
      'KMS key policy must grant kms:Decrypt to cloudfront.amazonaws.com',
    );
  });

  void it('does NOT create KMS key when encryption is S3_MANAGED (default)', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
    });

    const template = Template.fromStack(stack);
    const keys = template.findResources('AWS::KMS::Key');
    assert.strictEqual(
      Object.keys(keys).length,
      0,
      'Should NOT create a KMS key with default S3_MANAGED encryption',
    );
  });

  void it('does NOT create KMS key when storage.encryption is explicitly S3_MANAGED', () => {
    const staticDir = createStaticDir();
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest(staticDir),
      storage: { encryption: 'S3_MANAGED' },
    });

    const template = Template.fromStack(stack);
    const keys = template.findResources('AWS::KMS::Key');
    assert.strictEqual(
      Object.keys(keys).length,
      0,
      'Should NOT create a KMS key with explicit S3_MANAGED encryption',
    );
  });
});
