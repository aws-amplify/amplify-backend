import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { translateToManifest } from './manifest.js';
import { OpenNextOutput } from './types.js';

/**
 * Create a minimal OpenNext output for testing translation logic.
 */
const createMinimalOutput = (overrides?: Partial<OpenNextOutput>): OpenNextOutput => ({
  edgeFunctions: {},
  origins: {
    s3: {
      type: 's3',
      originPath: '_assets',
      copy: [
        { from: '.open-next/assets', to: '_assets', cached: true, versionedSubDir: '_next' },
        { from: '.open-next/cache', to: '_cache', cached: false },
      ],
    },
    default: {
      type: 'function',
      handler: 'index.handler',
      bundle: '.open-next/server-functions/default',
      streaming: false,
      wrapper: 'aws-lambda',
      converter: 'aws-apigw-v2',
      queue: 'sqs',
      incrementalCache: 's3',
      tagCache: 'dynamodb',
    },
    imageOptimizer: {
      type: 'function',
      handler: 'index.handler',
      bundle: '.open-next/image-optimization-function',
      streaming: false,
      wrapper: 'aws-lambda',
      converter: 'aws-apigw-v2',
      imageLoader: 's3',
    },
  },
  behaviors: [
    { pattern: '_next/image*', origin: 'imageOptimizer' },
    { pattern: '_next/data/*', origin: 'default' },
    { pattern: '*', origin: 'default' },
    { pattern: '_next/static/*', origin: 's3' },
    { pattern: 'favicon.ico', origin: 's3' },
    { pattern: 'robots.txt', origin: 's3' },
  ],
  ...overrides,
});

void describe('translateToManifest', () => {
  let tmpDir: string;
  let projectDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-translate-'));
    projectDir = tmpDir;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('generates a valid v2 manifest', () => {
    const output = createMinimalOutput();
    const manifest = translateToManifest(output, projectDir);

    assert.strictEqual(manifest.version, 2);
    assert.strictEqual(manifest.framework.name, 'nextjs');
    assert.ok(manifest.routes.length > 0);
    assert.ok(manifest.serverFunctions.length > 0);
    assert.ok(manifest.staticAssets);
  });

  void it('translates S3 behaviors as static routes', () => {
    const output = createMinimalOutput();
    const manifest = translateToManifest(output, projectDir);

    const staticRoute = manifest.routes.find((r) => r.path === '/_next/static/*');
    assert.ok(staticRoute);
    assert.strictEqual(staticRoute.type, 'static');
    assert.strictEqual(staticRoute.cacheControl, 'public, max-age=31536000, immutable');

    const faviconRoute = manifest.routes.find((r) => r.path === '/favicon.ico');
    assert.ok(faviconRoute);
    assert.strictEqual(faviconRoute.type, 'static');
  });

  void it('translates default origin as SSR catch-all', () => {
    const output = createMinimalOutput();
    const manifest = translateToManifest(output, projectDir);

    const catchAll = manifest.routes.find((r) => r.path === '/*');
    assert.ok(catchAll, 'Should have /* catch-all route');
    assert.strictEqual(catchAll.type, 'ssr');
    assert.strictEqual(catchAll.functionName, 'default');
  });

  void it('translates image optimizer as API route', () => {
    const output = createMinimalOutput();
    const manifest = translateToManifest(output, projectDir);

    const imageRoute = manifest.routes.find((r) => r.path === '/_next/image*');
    assert.ok(imageRoute, 'Should have /_next/image* route');
    assert.strictEqual(imageRoute.type, 'api');
    assert.strictEqual(imageRoute.functionName, 'image-optimizer');
  });

  void it('configures default server function correctly', () => {
    const output = createMinimalOutput();
    const manifest = translateToManifest(output, projectDir);

    const defaultFn = manifest.serverFunctions.find((f) => f.name === 'default');
    assert.ok(defaultFn);
    assert.strictEqual(defaultFn.handler, 'index.handler');
    assert.strictEqual(defaultFn.runtime, 'nodejs20.x');
    assert.strictEqual(defaultFn.timeout, 30);
    assert.strictEqual(defaultFn.memorySize, 512);
    assert.strictEqual(defaultFn.srcDir, '.open-next/server-functions/default');
  });

  void it('selects nodejs22.x runtime for Next.js 16+', () => {
    const output = createMinimalOutput();
    const manifest = translateToManifest(output, projectDir, '16.2.0');

    assert.strictEqual(manifest.serverFunctions[0].runtime, 'nodejs22.x');
    assert.strictEqual(manifest.framework.version, '16.2.0');
  });

  void it('selects nodejs20.x runtime when version unknown', () => {
    const output = createMinimalOutput();
    const manifest = translateToManifest(output, projectDir);

    assert.strictEqual(manifest.serverFunctions[0].runtime, 'nodejs20.x');
  });

  void it('configures cache when incremental cache is active', () => {
    const output = createMinimalOutput();
    const manifest = translateToManifest(output, projectDir);

    assert.ok(manifest.cache, 'Should have cache config');
    assert.strictEqual(manifest.cache!.enabled, true);
    assert.strictEqual(manifest.cache!.storage, 's3+dynamodb');
    assert.strictEqual(manifest.cache!.tagTracking, true);
  });

  void it('disables cache when incremental cache is dummy', () => {
    const output = createMinimalOutput();
    (output.origins.default as Record<string, unknown>).incrementalCache = 'dummy';
    const manifest = translateToManifest(output, projectDir);

    assert.strictEqual(manifest.cache, undefined);
  });

  void it('disables tag tracking when tag cache is disabled', () => {
    const output = createMinimalOutput({
      additionalProps: {
        disableTagCache: true,
      },
    });
    const manifest = translateToManifest(output, projectDir);

    assert.ok(manifest.cache);
    assert.strictEqual(manifest.cache!.tagTracking, false);
  });

  void it('includes image optimization config', () => {
    const output = createMinimalOutput();
    const manifest = translateToManifest(output, projectDir);

    assert.ok(manifest.imageOptimization);
    assert.strictEqual(manifest.imageOptimization!.enabled, true);
    assert.strictEqual(manifest.imageOptimization!.memorySize, 1024);
  });

  void it('includes middleware when present', () => {
    const output = createMinimalOutput({
      edgeFunctions: {
        middleware: {
          handler: 'handler.handler',
          bundle: '.open-next/middleware',
          pathResolver: 'pattern-env',
        },
      },
    });
    const manifest = translateToManifest(output, projectDir);

    assert.ok(manifest.middleware);
    assert.strictEqual(manifest.middleware!.src, '.open-next/middleware');
  });

  void it('does not include middleware when absent', () => {
    const output = createMinimalOutput();
    const manifest = translateToManifest(output, projectDir);

    assert.strictEqual(manifest.middleware, undefined);
  });

  void it('handles streaming lambda functions', () => {
    const output = createMinimalOutput();
    (output.origins.default as Record<string, unknown>).streaming = true;
    const manifest = translateToManifest(output, projectDir);

    const defaultFn = manifest.serverFunctions.find((f) => f.name === 'default');
    assert.ok(defaultFn);
    assert.ok(defaultFn.environment);
    assert.strictEqual(defaultFn.environment!.AWS_LWA_INVOKE_MODE, 'response_stream');
  });

  void it('handles multiple split function origins', () => {
    const output = createMinimalOutput();
    (output.origins as Record<string, unknown>)['apiFn'] = {
      type: 'function',
      handler: 'index.handler',
      bundle: '.open-next/server-functions/apiFn',
      streaming: false,
      wrapper: 'aws-lambda',
      converter: 'aws-apigw-v2',
      queue: 'sqs',
      incrementalCache: 's3',
      tagCache: 'dynamodb',
    };
    output.behaviors.unshift({ pattern: 'api/*', origin: 'apiFn' });

    const manifest = translateToManifest(output, projectDir);

    const apiFn = manifest.serverFunctions.find((f) => f.name === 'apiFn');
    assert.ok(apiFn, 'Should have apiFn server function');
    assert.strictEqual(apiFn.srcDir, '.open-next/server-functions/apiFn');
  });

  void it('reads build ID from .next/BUILD_ID', () => {
    const output = createMinimalOutput();
    const dotNextDir = path.join(projectDir, '.next');
    fs.mkdirSync(dotNextDir, { recursive: true });
    fs.writeFileSync(path.join(dotNextDir, 'BUILD_ID'), 'build-abc-123\n');

    const manifest = translateToManifest(output, projectDir);

    assert.strictEqual(manifest.buildId, 'build-abc-123');
  });

  void it('sets static asset baseDir from S3 origin', () => {
    const output = createMinimalOutput();
    const manifest = translateToManifest(output, projectDir);

    assert.strictEqual(manifest.staticAssets.baseDir, '_assets');
    assert.strictEqual(manifest.staticAssets.cacheControl, 'public, max-age=31536000, immutable');
  });

  void it('all routes start with /', () => {
    const output = createMinimalOutput();
    const manifest = translateToManifest(output, projectDir);

    for (const route of manifest.routes) {
      assert.ok(
        route.path.startsWith('/'),
        `Route "${route.path}" must start with /`,
      );
    }
  });

  void it('all route types are valid', () => {
    const output = createMinimalOutput();
    const manifest = translateToManifest(output, projectDir);

    const validTypes = ['static', 'ssr', 'isr', 'api'];
    for (const route of manifest.routes) {
      assert.ok(
        validTypes.includes(route.type),
        `Route type "${route.type}" is not valid`,
      );
    }
  });
});
