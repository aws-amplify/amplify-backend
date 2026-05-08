import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { nextjsAdapter } from './nextjs.js';
import { deployManifestSchema } from '../manifest/schema.js';

// Direct require to get the real module (not __importStar wrapper)
// so mock.method can replace the property on the shared module singleton.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const childProcessModule = require('child_process') as typeof import('child_process');

void describe('nextjsAdapter', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-nextjs-test-'));
    // Mock execFileSync so OpenNext build doesn't actually run
    mock.method(childProcessModule, 'execFileSync', () => undefined);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    mock.restoreAll();
  });

  void it('translates OpenNext output to DeployManifest', () => {
    // Set up a mock .open-next/ directory with output manifest
    const openNextDir = path.join(tmpDir, '.open-next');
    fs.mkdirSync(openNextDir, { recursive: true });

    // Create server-functions/default directory
    const defaultFnDir = path.join(openNextDir, 'server-functions', 'default');
    fs.mkdirSync(defaultFnDir, { recursive: true });
    fs.writeFileSync(
      path.join(defaultFnDir, 'index.mjs'),
      'export const handler = async () => {};',
    );

    // Create assets directory
    const assetsDir = path.join(openNextDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, 'index.html'), '<html></html>');

    // Create open-next.output.json
    const outputManifest = {
      origins: {
        default: {
          type: 'function',
          handler: 'index.handler',
          streaming: true,
        },
      },
      behaviors: [
        { pattern: '/_next/static/*', origin: 's3' },
        { pattern: '/*', origin: 'default' },
      ],
      additionalProps: {},
    };
    fs.writeFileSync(
      path.join(openNextDir, 'open-next.output.json'),
      JSON.stringify(outputManifest),
    );

    const manifest = nextjsAdapter({ projectDir: tmpDir });

    assert.strictEqual(manifest.version, 1);

    // Should have a default compute resource
    assert.ok(manifest.compute['default']);
    assert.strictEqual(manifest.compute['default'].type, 'handler');
    assert.strictEqual(manifest.compute['default'].handler, 'index.handler');
    assert.strictEqual(manifest.compute['default'].streaming, true);
    assert.strictEqual(manifest.compute['default'].placement, 'regional');

    // Should have routes
    assert.ok(manifest.routes.length >= 2);
    const staticRoute = manifest.routes.find(
      (r) => r.pattern === '/_next/static/*',
    );
    assert.ok(staticRoute);
    assert.strictEqual(staticRoute!.target, 's3');

    const catchAllRoute = manifest.routes.find((r) => r.pattern === '/*');
    assert.ok(catchAllRoute);
    assert.strictEqual(catchAllRoute!.target, 'default');

    // Static assets directory
    assert.strictEqual(manifest.staticAssets.directory, assetsDir);
  });

  void it('detects ISR cache when not disabled', () => {
    const openNextDir = path.join(tmpDir, '.open-next');
    fs.mkdirSync(path.join(openNextDir, 'server-functions', 'default'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(openNextDir, 'server-functions', 'default', 'index.mjs'),
      'export const handler = async () => {};',
    );
    fs.mkdirSync(path.join(openNextDir, 'assets'), { recursive: true });
    // ISR evidence: revalidation-function directory exists
    fs.mkdirSync(path.join(openNextDir, 'revalidation-function'), {
      recursive: true,
    });

    fs.writeFileSync(
      path.join(openNextDir, 'open-next.output.json'),
      JSON.stringify({
        origins: {
          default: { type: 'function', handler: 'index.handler' },
        },
        behaviors: [{ pattern: '/*', origin: 'default' }],
        additionalProps: {},
      }),
    );

    const manifest = nextjsAdapter({ projectDir: tmpDir });

    assert.ok(manifest.cache);
    assert.strictEqual(manifest.cache!.tagRevalidation, true);
    assert.strictEqual(manifest.cache!.revalidationQueue, true);
    assert.strictEqual(manifest.cache!.computeResource, 'default');
  });

  void it('does not add cache when ISR is disabled', () => {
    const openNextDir = path.join(tmpDir, '.open-next');
    fs.mkdirSync(path.join(openNextDir, 'server-functions', 'default'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(openNextDir, 'server-functions', 'default', 'index.mjs'),
      'export const handler = async () => {};',
    );
    fs.mkdirSync(path.join(openNextDir, 'assets'), { recursive: true });

    fs.writeFileSync(
      path.join(openNextDir, 'open-next.output.json'),
      JSON.stringify({
        origins: {
          default: { type: 'function', handler: 'index.handler' },
        },
        behaviors: [{ pattern: '/*', origin: 'default' }],
        additionalProps: { disableIncrementalCache: true },
      }),
    );

    const manifest = nextjsAdapter({ projectDir: tmpDir });
    assert.strictEqual(manifest.cache, undefined);
  });

  void it('detects image optimization function', () => {
    const openNextDir = path.join(tmpDir, '.open-next');
    fs.mkdirSync(path.join(openNextDir, 'server-functions', 'default'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(openNextDir, 'server-functions', 'default', 'index.mjs'),
      'export const handler = async () => {};',
    );
    fs.mkdirSync(path.join(openNextDir, 'assets'), { recursive: true });

    // Create image optimization function directory
    const imgDir = path.join(openNextDir, 'image-optimization-function');
    fs.mkdirSync(imgDir, { recursive: true });
    fs.writeFileSync(
      path.join(imgDir, 'index.mjs'),
      'export const handler = async () => {};',
    );

    fs.writeFileSync(
      path.join(openNextDir, 'open-next.output.json'),
      JSON.stringify({
        origins: {
          default: { type: 'function', handler: 'index.handler' },
        },
        behaviors: [{ pattern: '/*', origin: 'default' }],
        additionalProps: {},
      }),
    );

    const manifest = nextjsAdapter({ projectDir: tmpDir });

    assert.ok(manifest.imageOptimization);
    assert.strictEqual(manifest.imageOptimization!.bundle, imgDir);
    assert.strictEqual(manifest.imageOptimization!.handler, 'index.handler');
    assert.deepStrictEqual(manifest.imageOptimization!.formats, [
      'webp',
      'avif',
    ]);
  });

  void it('detects middleware', () => {
    const openNextDir = path.join(tmpDir, '.open-next');
    fs.mkdirSync(path.join(openNextDir, 'server-functions', 'default'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(openNextDir, 'server-functions', 'default', 'index.mjs'),
      'export const handler = async () => {};',
    );
    fs.mkdirSync(path.join(openNextDir, 'assets'), { recursive: true });

    // Create middleware directory
    const mwDir = path.join(openNextDir, 'middleware');
    fs.mkdirSync(mwDir, { recursive: true });
    fs.writeFileSync(
      path.join(mwDir, 'handler.mjs'),
      'export const handler = async () => {};',
    );

    fs.writeFileSync(
      path.join(openNextDir, 'open-next.output.json'),
      JSON.stringify({
        origins: {
          default: { type: 'function', handler: 'index.handler' },
        },
        behaviors: [{ pattern: '/*', origin: 'default' }],
        additionalProps: {},
      }),
    );

    const manifest = nextjsAdapter({ projectDir: tmpDir });

    assert.ok(manifest.middleware);
    assert.strictEqual(manifest.middleware!.bundle, mwDir);
    assert.strictEqual(manifest.middleware!.handler, 'handler.handler');
  });

  void it('throws when open-next output is missing', () => {
    assert.throws(
      () => nextjsAdapter({ projectDir: tmpDir }),
      (error: Error) => {
        assert.strictEqual(error.name, 'OpenNextOutputNotFoundError');
        return true;
      },
    );
  });

  void it('handles http-server origin type', () => {
    const openNextDir = path.join(tmpDir, '.open-next');
    fs.mkdirSync(path.join(openNextDir, 'server-functions', 'default'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(openNextDir, 'server-functions', 'default', 'server.js'),
      'const http = require("http");',
    );
    fs.mkdirSync(path.join(openNextDir, 'assets'), { recursive: true });

    fs.writeFileSync(
      path.join(openNextDir, 'open-next.output.json'),
      JSON.stringify({
        origins: {
          default: {
            type: 'ecs',
            entrypoint: 'server.js',
            port: 8080,
            streaming: false,
          },
        },
        behaviors: [{ pattern: '/*', origin: 'default' }],
        additionalProps: {},
      }),
    );

    const manifest = nextjsAdapter({ projectDir: tmpDir });

    assert.ok(manifest.compute['default']);
    assert.strictEqual(manifest.compute['default'].type, 'http-server');
    assert.strictEqual(manifest.compute['default'].entrypoint, 'server.js');
    assert.strictEqual(manifest.compute['default'].port, 8080);
    assert.strictEqual(manifest.compute['default'].streaming, false);
  });

  void it('handles edge origin type', () => {
    const openNextDir = path.join(tmpDir, '.open-next');
    fs.mkdirSync(path.join(openNextDir, 'server-functions', 'default'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(openNextDir, 'server-functions', 'default', 'index.mjs'),
      'export const handler = async () => {};',
    );
    fs.mkdirSync(path.join(openNextDir, 'assets'), { recursive: true });

    fs.writeFileSync(
      path.join(openNextDir, 'open-next.output.json'),
      JSON.stringify({
        origins: {
          default: {
            type: 'edge',
            handler: 'index.handler',
          },
        },
        behaviors: [{ pattern: '/*', origin: 'default' }],
        additionalProps: {},
      }),
    );

    const manifest = nextjsAdapter({ projectDir: tmpDir });

    assert.ok(manifest.compute['default']);
    assert.strictEqual(manifest.compute['default'].type, 'edge');
    assert.strictEqual(manifest.compute['default'].placement, 'global');
  });

  void it('skips s3 origin in compute mapping', () => {
    const openNextDir = path.join(tmpDir, '.open-next');
    fs.mkdirSync(path.join(openNextDir, 'server-functions', 'default'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(openNextDir, 'server-functions', 'default', 'index.mjs'),
      'export const handler = async () => {};',
    );
    fs.mkdirSync(path.join(openNextDir, 'assets'), { recursive: true });

    fs.writeFileSync(
      path.join(openNextDir, 'open-next.output.json'),
      JSON.stringify({
        origins: {
          s3: { type: 'function' },
          default: { type: 'function', handler: 'index.handler' },
        },
        behaviors: [
          { pattern: '/_next/static/*', origin: 's3' },
          { pattern: '/*', origin: 'default' },
        ],
        additionalProps: {},
      }),
    );

    const manifest = nextjsAdapter({ projectDir: tmpDir });

    // s3 should not be in compute
    assert.strictEqual(manifest.compute['s3'], undefined);
    assert.ok(manifest.compute['default']);
  });

  void it('adds catch-all route if missing from behaviors', () => {
    const openNextDir = path.join(tmpDir, '.open-next');
    fs.mkdirSync(path.join(openNextDir, 'server-functions', 'default'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(openNextDir, 'server-functions', 'default', 'index.mjs'),
      'export const handler = async () => {};',
    );
    fs.mkdirSync(path.join(openNextDir, 'assets'), { recursive: true });

    fs.writeFileSync(
      path.join(openNextDir, 'open-next.output.json'),
      JSON.stringify({
        origins: {
          default: { type: 'function', handler: 'index.handler' },
        },
        behaviors: [
          { pattern: '/_next/static/*', origin: 's3' },
          { pattern: '/api/*', origin: 'default' },
        ],
        additionalProps: {},
      }),
    );

    const manifest = nextjsAdapter({ projectDir: tmpDir });

    const catchAll = manifest.routes.find((r) => r.pattern === '/*');
    assert.ok(catchAll, 'Should add catch-all route');
    assert.strictEqual(catchAll!.target, 'default');
  });

  void it('adapter output passes schema validation', () => {
    const openNextDir = path.join(tmpDir, '.open-next');
    fs.mkdirSync(path.join(openNextDir, 'server-functions', 'default'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(openNextDir, 'server-functions', 'default', 'index.mjs'),
      'export const handler = async () => {};',
    );
    fs.mkdirSync(path.join(openNextDir, 'assets'), { recursive: true });
    fs.writeFileSync(
      path.join(openNextDir, 'assets', 'index.html'),
      '<html></html>',
    );

    fs.writeFileSync(
      path.join(openNextDir, 'open-next.output.json'),
      JSON.stringify({
        origins: {
          default: {
            type: 'function',
            handler: 'index.handler',
            streaming: true,
          },
        },
        behaviors: [
          { pattern: '/_next/static/*', origin: 's3' },
          { pattern: '/*', origin: 'default' },
        ],
        additionalProps: {},
      }),
    );

    const manifest = nextjsAdapter({ projectDir: tmpDir });
    const result = deployManifestSchema.safeParse(manifest);
    assert.ok(
      result.success,
      `Schema validation failed: ${JSON.stringify(result.error?.issues)}`,
    );
  });

  void it('copies amplify_outputs.json into server function bundles', () => {
    const openNextDir = path.join(tmpDir, '.open-next');
    const serverFnDir = path.join(openNextDir, 'server-function');
    fs.mkdirSync(serverFnDir, { recursive: true });
    fs.writeFileSync(
      path.join(serverFnDir, 'index.mjs'),
      'export const handler = async () => {};',
    );
    fs.mkdirSync(path.join(openNextDir, 'assets'), { recursive: true });

    fs.writeFileSync(
      path.join(openNextDir, 'open-next.output.json'),
      JSON.stringify({
        origins: {
          default: { type: 'function', handler: 'index.handler' },
        },
        behaviors: [{ pattern: '/*', origin: 'default' }],
        additionalProps: {},
      }),
    );

    // Create amplify_outputs.json at project root
    const amplifyOutputs = {
      auth: { user_pool_id: 'us-east-1_TEST' },
      data: {
        url: 'https://test.appsync.amazonaws.com/graphql',
        api_key: 'da2-test',
      },
    };
    fs.writeFileSync(
      path.join(tmpDir, 'amplify_outputs.json'),
      JSON.stringify(amplifyOutputs),
    );

    nextjsAdapter({ projectDir: tmpDir });

    // Verify amplify_outputs.json was copied into server-function/
    const copiedPath = path.join(serverFnDir, 'amplify_outputs.json');
    assert.ok(
      fs.existsSync(copiedPath),
      'amplify_outputs.json should be copied into server-function bundle',
    );
    const copiedContent = JSON.parse(fs.readFileSync(copiedPath, 'utf-8'));
    assert.strictEqual(copiedContent.auth.user_pool_id, 'us-east-1_TEST');
  });

  void it('copies amplify_outputs.json into multi-function server bundles', () => {
    const openNextDir = path.join(tmpDir, '.open-next');
    const defaultFnDir = path.join(openNextDir, 'server-functions', 'default');
    const apiFnDir = path.join(openNextDir, 'server-functions', 'api');
    fs.mkdirSync(defaultFnDir, { recursive: true });
    fs.mkdirSync(apiFnDir, { recursive: true });
    fs.writeFileSync(
      path.join(defaultFnDir, 'index.mjs'),
      'export const handler = async () => {};',
    );
    fs.writeFileSync(
      path.join(apiFnDir, 'index.mjs'),
      'export const handler = async () => {};',
    );
    fs.mkdirSync(path.join(openNextDir, 'assets'), { recursive: true });

    fs.writeFileSync(
      path.join(openNextDir, 'open-next.output.json'),
      JSON.stringify({
        origins: {
          default: { type: 'function', handler: 'index.handler' },
          api: { type: 'function', handler: 'index.handler' },
        },
        behaviors: [
          { pattern: '/api/*', origin: 'api' },
          { pattern: '/*', origin: 'default' },
        ],
        additionalProps: {},
      }),
    );

    fs.writeFileSync(
      path.join(tmpDir, 'amplify_outputs.json'),
      JSON.stringify({ data: { url: 'https://example.com' } }),
    );

    nextjsAdapter({ projectDir: tmpDir });

    // Both server function dirs should have the file
    assert.ok(
      fs.existsSync(path.join(defaultFnDir, 'amplify_outputs.json')),
      'amplify_outputs.json should be in default server function bundle',
    );
    assert.ok(
      fs.existsSync(path.join(apiFnDir, 'amplify_outputs.json')),
      'amplify_outputs.json should be in api server function bundle',
    );
  });

  void it('does not fail if amplify_outputs.json is absent', () => {
    const openNextDir = path.join(tmpDir, '.open-next');
    const serverFnDir = path.join(openNextDir, 'server-function');
    fs.mkdirSync(serverFnDir, { recursive: true });
    fs.writeFileSync(
      path.join(serverFnDir, 'index.mjs'),
      'export const handler = async () => {};',
    );
    fs.mkdirSync(path.join(openNextDir, 'assets'), { recursive: true });

    fs.writeFileSync(
      path.join(openNextDir, 'open-next.output.json'),
      JSON.stringify({
        origins: {
          default: { type: 'function', handler: 'index.handler' },
        },
        behaviors: [{ pattern: '/*', origin: 'default' }],
        additionalProps: {},
      }),
    );

    // No amplify_outputs.json — should not throw
    const manifest = nextjsAdapter({ projectDir: tmpDir });
    assert.ok(
      manifest,
      'Should produce a manifest even without amplify_outputs.json',
    );
    assert.ok(
      !fs.existsSync(path.join(serverFnDir, 'amplify_outputs.json')),
      'Should not create amplify_outputs.json if source does not exist',
    );
  });
});
