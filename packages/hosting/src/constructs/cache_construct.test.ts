import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AmplifyHostingConstruct } from './hosting_construct.js';
import { DeployManifestV2 } from '../manifest/deploy_manifest.js';
import { DeployManifest } from '../manifest/types.js';

// ---- Helpers ----

const createStack = (): Stack => {
  const app = new App();
  return new Stack(app, 'TestStack');
};

/**
 * Create a minimal v2 manifest with ISR routes and cache enabled.
 */
const createV2ManifestWithCache = (): DeployManifestV2 => ({
  version: 2,
  routes: [
    { path: '/_next/static/*', type: 'static' },
    { path: '/blog/[slug]', type: 'isr', revalidate: 60, tags: ['blog'], functionName: 'default' },
    { path: '/products', type: 'isr', revalidate: 300, tags: ['products'], functionName: 'default' },
    { path: '/*', type: 'ssr', functionName: 'default' },
  ],
  staticAssets: { baseDir: '_next/static' },
  serverFunctions: [
    {
      name: 'default',
      handler: 'run.sh',
      runtime: 'nodejs20.x',
      timeout: 30,
      memorySize: 512,
      environment: { NODE_ENV: 'production' },
    },
  ],
  cache: {
    enabled: true,
    storage: 's3+dynamodb',
    tagTracking: true,
  },
  framework: { name: 'nextjs', version: '15.0.0' },
  buildId: 'v2-cache-test-1',
});

/**
 * Create a v2 manifest without cache (no ISR routes).
 */
const createV2ManifestWithoutCache = (): DeployManifestV2 => ({
  version: 2,
  routes: [
    { path: '/_next/static/*', type: 'static' },
    { path: '/*', type: 'ssr', functionName: 'default' },
  ],
  staticAssets: { baseDir: '_next/static' },
  serverFunctions: [
    {
      name: 'default',
      handler: 'run.sh',
      runtime: 'nodejs20.x',
      timeout: 30,
      memorySize: 512,
    },
  ],
  framework: { name: 'nextjs', version: '15.0.0' },
  buildId: 'v2-no-cache-test-1',
});

/**
 * Create a v2 SPA manifest (no server functions, no cache).
 */
const createV2SpaManifest = (): DeployManifestV2 => ({
  version: 2,
  routes: [{ path: '/*', type: 'static' }],
  staticAssets: { baseDir: 'static' },
  serverFunctions: [],
  framework: { name: 'spa' },
  buildId: 'v2-spa-test-1',
});

// ================================================================
// V2 manifest with cache — provisions S3 + DynamoDB
// ================================================================

void describe('AmplifyHostingConstruct — V2 manifest with cache', () => {
  let tmpDir: string;
  let staticDir: string;
  let computeDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-v2-cache-test-'));
    staticDir = path.join(tmpDir, 'static');
    computeDir = path.join(tmpDir, 'compute');
    const defaultDir = path.join(computeDir, 'default');
    fs.mkdirSync(staticDir, { recursive: true });
    fs.mkdirSync(defaultDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
    fs.writeFileSync(
      path.join(defaultDir, 'run.sh'),
      '#!/bin/bash\nexec node server.js',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('provisions S3 cache bucket when cache.enabled is true', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: createV2ManifestWithCache(),
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);

    // Should have at least 2 S3 buckets: hosting bucket + cache bucket
    const buckets = template.findResources('AWS::S3::Bucket');
    assert.ok(
      Object.keys(buckets).length >= 2,
      `Expected at least 2 S3 buckets, got ${Object.keys(buckets).length}`,
    );

    // Cache bucket should have BlockPublicAccess
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  void it('provisions DynamoDB table for cache tag tracking', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: createV2ManifestWithCache(),
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: Match.arrayWith([
        Match.objectLike({ AttributeName: 'tag', KeyType: 'HASH' }),
        Match.objectLike({ AttributeName: 'cacheKey', KeyType: 'RANGE' }),
      ]),
      BillingMode: 'PAY_PER_REQUEST',
    });
  });

  void it('grants Lambda read/write access to cache bucket', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: createV2ManifestWithCache(),
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);

    // CDK's grantReadWrite produces s3:GetObject*, s3:GetBucket*, s3:List*, s3:DeleteObject*, s3:PutObject*, s3:Abort*
    // Check that the SSR role has a policy with s3 actions
    const policies = template.findResources('AWS::IAM::Policy');
    const hasS3Grant = Object.values(policies).some((policy: any) => {
      const statements = policy.Properties?.PolicyDocument?.Statement ?? [];
      return statements.some((s: any) => {
        const actions = Array.isArray(s.Action) ? s.Action : [s.Action];
        return (
          s.Effect === 'Allow' &&
          actions.some((a: string) => a.startsWith('s3:GetObject'))
        );
      });
    });

    assert.ok(hasS3Grant, 'Should have an IAM policy granting S3 access');
  });

  void it('grants Lambda read/write access to DynamoDB table', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: createV2ManifestWithCache(),
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);

    // CDK's grantReadWriteData produces dynamodb:BatchGetItem, dynamodb:GetRecords, etc.
    const policies = template.findResources('AWS::IAM::Policy');
    const hasDynamoGrant = Object.values(policies).some((policy: any) => {
      const statements = policy.Properties?.PolicyDocument?.Statement ?? [];
      return statements.some((s: any) => {
        const actions = Array.isArray(s.Action) ? s.Action : [s.Action];
        return (
          s.Effect === 'Allow' &&
          actions.some((a: string) => a.startsWith('dynamodb:'))
        );
      });
    });

    assert.ok(
      hasDynamoGrant,
      'Should have an IAM policy granting DynamoDB access',
    );
  });

  void it('injects CACHE_BUCKET_NAME and CACHE_TABLE_NAME into Lambda env vars', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: createV2ManifestWithCache(),
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: Match.objectLike({
        Variables: Match.objectLike({
          CACHE_BUCKET_NAME: Match.anyValue(),
          CACHE_TABLE_NAME: Match.anyValue(),
        }),
      }),
    });
  });

  void it('injects server function environment variables from manifest', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: createV2ManifestWithCache(),
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: Match.objectLike({
        Variables: Match.objectLike({
          NODE_ENV: 'production',
        }),
      }),
    });
  });
});

// ================================================================
// V2 manifest without cache — does NOT provision cache infra
// ================================================================

void describe('AmplifyHostingConstruct — V2 manifest without cache', () => {
  let tmpDir: string;
  let staticDir: string;
  let computeDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-v2-no-cache-test-'),
    );
    staticDir = path.join(tmpDir, 'static');
    computeDir = path.join(tmpDir, 'compute');
    const defaultDir = path.join(computeDir, 'default');
    fs.mkdirSync(staticDir, { recursive: true });
    fs.mkdirSync(defaultDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
    fs.writeFileSync(
      path.join(defaultDir, 'run.sh'),
      '#!/bin/bash\nexec node server.js',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('does NOT create DynamoDB table when cache is not enabled', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: createV2ManifestWithoutCache(),
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);
    const tables = template.findResources('AWS::DynamoDB::Table');
    assert.strictEqual(
      Object.keys(tables).length,
      0,
      'Should not create DynamoDB table when cache is not enabled',
    );
  });

  void it('does NOT inject CACHE_BUCKET_NAME when cache is not enabled', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: createV2ManifestWithoutCache(),
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);

    // Lambda should exist but NOT have CACHE_BUCKET_NAME
    const functions = template.findResources('AWS::Lambda::Function');
    for (const [, fn] of Object.entries(functions)) {
      const env = (fn as any).Properties?.Environment?.Variables;
      if (env) {
        assert.strictEqual(
          env.CACHE_BUCKET_NAME,
          undefined,
          'Should not inject CACHE_BUCKET_NAME when cache is disabled',
        );
      }
    }
  });
});

// ================================================================
// V2 SPA manifest — static only
// ================================================================

void describe('AmplifyHostingConstruct — V2 SPA (no compute, no cache)', () => {
  let tmpDir: string;
  let staticDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-v2-spa-test-'));
    staticDir = path.join(tmpDir, 'static');
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('creates S3 bucket and CloudFront without SSR Lambda', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: createV2SpaManifest(),
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);

    // Should have S3 bucket
    template.hasResourceProperties('AWS::S3::Bucket', Match.anyValue());

    // Should have CloudFront distribution
    template.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.anyValue(),
    );

    // Should NOT have an SSR Lambda function (BucketDeployment custom resource Lambdas are OK)
    const functions = template.findResources('AWS::Lambda::Function');
    const ssrFunctions = Object.entries(functions).filter(([key]) =>
      key.includes('SsrFunction'),
    );
    assert.strictEqual(
      ssrFunctions.length,
      0,
      'SPA should not create SSR Lambda functions',
    );
  });

  void it('does NOT create cache infrastructure', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: createV2SpaManifest(),
      staticAssetPath: staticDir,
    });

    const template = Template.fromStack(stack);
    const tables = template.findResources('AWS::DynamoDB::Table');
    assert.strictEqual(Object.keys(tables).length, 0);
  });
});

// ================================================================
// V1 manifest backward compatibility
// ================================================================

void describe('AmplifyHostingConstruct — V1 manifest (backward compat)', () => {
  let tmpDir: string;
  let staticDir: string;
  let computeDir: string;

  const v1SsrManifest: DeployManifest = {
    version: 1,
    routes: [
      { path: '/_next/static/*', target: { kind: 'Static' } },
      { path: '/*', target: { kind: 'Compute', src: 'default' } },
    ],
    computeResources: [
      { name: 'default', runtime: 'nodejs20.x', entrypoint: 'run.sh' },
    ],
    framework: { name: 'nextjs', version: '15.0.0' },
    buildId: 'v1-compat-test-1',
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-v1-compat-test-'));
    staticDir = path.join(tmpDir, 'static');
    computeDir = path.join(tmpDir, 'compute');
    const defaultDir = path.join(computeDir, 'default');
    fs.mkdirSync(staticDir, { recursive: true });
    fs.mkdirSync(defaultDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
    fs.writeFileSync(
      path.join(defaultDir, 'run.sh'),
      '#!/bin/bash\nexec node server.js',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('still creates Lambda for v1 SSR manifest', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: v1SsrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      Handler: 'run.sh',
    });
  });

  void it('does NOT create cache resources for v1 manifest', () => {
    const stack = createStack();
    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: v1SsrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack);
    const tables = template.findResources('AWS::DynamoDB::Table');
    assert.strictEqual(
      Object.keys(tables).length,
      0,
      'V1 manifest should not create DynamoDB table',
    );
  });
});

// ================================================================
// V2 multi-compute validation
// ================================================================

void describe('AmplifyHostingConstruct — V2 validation', () => {
  let tmpDir: string;
  let staticDir: string;
  let computeDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-v2-validation-test-'),
    );
    staticDir = path.join(tmpDir, 'static');
    computeDir = path.join(tmpDir, 'compute');
    fs.mkdirSync(staticDir, { recursive: true });
    fs.mkdirSync(path.join(computeDir, 'default'), { recursive: true });
    fs.mkdirSync(path.join(computeDir, 'api'), { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');
    fs.writeFileSync(
      path.join(computeDir, 'default', 'run.sh'),
      '#!/bin/bash\nexec node server.js',
    );
    fs.writeFileSync(
      path.join(computeDir, 'api', 'run.sh'),
      '#!/bin/bash\nexec node server.js',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('throws UnsupportedMultiComputeError for v2 manifest with multiple server functions', () => {
    const manifest: DeployManifestV2 = {
      version: 2,
      routes: [{ path: '/*', type: 'ssr', functionName: 'default' }],
      staticAssets: { baseDir: 'static' },
      serverFunctions: [
        { name: 'default', handler: 'run.sh', runtime: 'nodejs20.x' },
        { name: 'api', handler: 'run.sh', runtime: 'nodejs20.x' },
      ],
      framework: { name: 'nextjs' },
      buildId: 'multi-compute-test',
    };

    const stack = createStack();
    assert.throws(
      () =>
        new AmplifyHostingConstruct(stack, 'Hosting', {
          manifest,
          staticAssetPath: staticDir,
          computeBasePath: computeDir,
          skipRegionValidation: true,
        }),
      /UnsupportedMultiComputeError/,
    );
  });

  void it('throws MissingComputeBasePathError when computeBasePath is missing for v2 SSR', () => {
    const manifest: DeployManifestV2 = {
      version: 2,
      routes: [{ path: '/*', type: 'ssr', functionName: 'default' }],
      staticAssets: { baseDir: 'static' },
      serverFunctions: [
        { name: 'default', handler: 'run.sh', runtime: 'nodejs20.x' },
      ],
      framework: { name: 'nextjs' },
      buildId: 'missing-path-test',
    };

    const stack = createStack();
    assert.throws(
      () =>
        new AmplifyHostingConstruct(stack, 'Hosting', {
          manifest,
          staticAssetPath: staticDir,
          skipRegionValidation: true,
        }),
      /MissingComputeBasePathError/,
    );
  });
});
