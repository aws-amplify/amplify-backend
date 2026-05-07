import { afterEach, describe, it } from 'node:test';
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
    template.resourceCountIs('AWS::SQS::Queue', 1);
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
      (p: Record<string, unknown>) =>
        (p as { Properties?: { Action?: string } }).Properties?.Action ===
        'lambda:InvokeFunctionUrl',
    );
    assert.ok(
      invokeUrlPermissions.length >= 2,
      `Expected at least 2 InvokeFunctionUrl permissions, got ${invokeUrlPermissions.length}`,
    );
  });
});
