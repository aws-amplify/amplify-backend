import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from './spawn.js';
import {
  hasExistingMiddlewareManifest,
  nextjsAdapter,
  patchEdgeBundlesForLambdaEdge,
  patchStreamingWrapperForApiGateway,
  projectHasEdgeRuntimeRoutes,
  stripNextInternalLocale,
} from './nextjs.js';
import { deployManifestSchema } from '../manifest/schema.js';

void describe('nextjsAdapter', () => {
  let tmpDir: string;
  let lenientBackup: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-nextjs-test-'));
    // Mock the spawn wrapper so OpenNext build doesn't actually run
    mock.method(spawn, 'sync', () => undefined);
    // The fixture stubs don't include OpenNext's streaming-wrapper or
    // edge-banner signatures, so the brittleness-throw path would fire
    // under the synthesized inputs. The patches are not under test here;
    // run them in lenient mode so the manifest-translation assertions
    // get to run.
    lenientBackup = process.env.AMPLIFY_HOSTING_LENIENT_PATCHES;
    process.env.AMPLIFY_HOSTING_LENIENT_PATCHES = '1';
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    mock.restoreAll();
    if (lenientBackup === undefined) {
      delete process.env.AMPLIFY_HOSTING_LENIENT_PATCHES;
    } else {
      process.env.AMPLIFY_HOSTING_LENIENT_PATCHES = lenientBackup;
    }
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
    assert.ok(
      manifest.cache!.revalidationFunction,
      'Should include revalidation function when revalidation-function dir exists',
    );
    assert.strictEqual(
      manifest.cache!.revalidationFunction!.handler,
      'index.handler',
    );
    assert.ok(
      manifest.cache!.revalidationFunction!.bundle.includes(
        'revalidation-function',
      ),
    );
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

void describe('hasExistingMiddlewareManifest', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nextjs-manifest-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  void it('returns false when .next/server/middleware-manifest.json is missing', () => {
    assert.strictEqual(hasExistingMiddlewareManifest(tmp), false);
  });

  void it('returns true when the manifest exists', () => {
    const dir = path.join(tmp, '.next', 'server');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'middleware-manifest.json'),
      JSON.stringify({ functions: {} }),
    );
    assert.strictEqual(hasExistingMiddlewareManifest(tmp), true);
  });
});

void describe('projectHasEdgeRuntimeRoutes', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nextjs-edge-scan-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const writeFile = (rel: string, contents: string): void => {
    const full = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  };

  void it('returns false for a project with no source files', () => {
    assert.strictEqual(projectHasEdgeRuntimeRoutes(tmp), false);
  });

  void it('returns false when no file declares runtime: edge', () => {
    writeFile(
      'app/page.tsx',
      'export default function Page() { return null; }',
    );
    writeFile(
      'app/api/users/route.ts',
      'export async function GET() { return Response.json({}); }',
    );
    assert.strictEqual(projectHasEdgeRuntimeRoutes(tmp), false);
  });

  void it("returns true when a route declares runtime = 'edge' (App Router)", () => {
    writeFile(
      'app/api/edge/route.ts',
      "export const runtime = 'edge';\nexport async function GET() { return Response.json({}); }",
    );
    assert.strictEqual(projectHasEdgeRuntimeRoutes(tmp), true);
  });

  void it("returns true when a Pages Router api file declares runtime: 'experimental-edge'", () => {
    writeFile(
      'pages/api/edge.ts',
      "export const config = { runtime: 'experimental-edge' };\nexport default function handler() {}",
    );
    assert.strictEqual(projectHasEdgeRuntimeRoutes(tmp), true);
  });

  void it('scans src/app/ as well as app/', () => {
    writeFile(
      'src/app/api/edge/route.ts',
      "export const runtime = 'edge';\nexport async function GET() {}",
    );
    assert.strictEqual(projectHasEdgeRuntimeRoutes(tmp), true);
  });

  void it('skips node_modules and dot-prefixed directories', () => {
    // Edge declaration only inside node_modules — must not trigger.
    writeFile(
      'node_modules/some-pkg/edge.ts',
      "export const runtime = 'edge';",
    );
    writeFile('.next/cache/edge.ts', "export const runtime = 'edge';");
    assert.strictEqual(projectHasEdgeRuntimeRoutes(tmp), false);
  });

  void it('returns false if no app/ or pages/ directories exist', () => {
    writeFile('lib/util.ts', "export const runtime = 'edge';");
    assert.strictEqual(projectHasEdgeRuntimeRoutes(tmp), false);
  });
});

void describe('patchStreamingWrapperForApiGateway — brittleness gating', () => {
  let tmp: string;
  let defaultDir: string;
  let envBackup: string | undefined;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-patch-stream-'));
    defaultDir = path.join(tmp, 'server-functions', 'default');
    fs.mkdirSync(defaultDir, { recursive: true });
    envBackup = process.env.AMPLIFY_HOSTING_LENIENT_PATCHES;
    delete process.env.AMPLIFY_HOSTING_LENIENT_PATCHES;
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    if (envBackup === undefined) {
      delete process.env.AMPLIFY_HOSTING_LENIENT_PATCHES;
    } else {
      process.env.AMPLIFY_HOSTING_LENIENT_PATCHES = envBackup;
    }
  });

  void it('throws UpstreamPatchPatternChangedError when no bundle matches', () => {
    fs.writeFileSync(
      path.join(defaultDir, 'index.mjs'),
      'export const handler = async () => ({});',
    );
    assert.throws(
      () => patchStreamingWrapperForApiGateway(tmp),
      (error: Error) => error.name === 'UpstreamPatchPatternChangedError',
    );
  });

  void it('AMPLIFY_HOSTING_LENIENT_PATCHES=1 reverts to a warning', () => {
    fs.writeFileSync(
      path.join(defaultDir, 'index.mjs'),
      'export const handler = async () => ({});',
    );
    process.env.AMPLIFY_HOSTING_LENIENT_PATCHES = '1';
    assert.doesNotThrow(() => patchStreamingWrapperForApiGateway(tmp));
  });

  void it('returns silently when server-functions dir is missing', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-empty-'));
    assert.doesNotThrow(() => patchStreamingWrapperForApiGateway(empty));
    fs.rmSync(empty, { recursive: true, force: true });
  });
});

void describe('patchEdgeBundlesForLambdaEdge — brittleness gating', () => {
  let tmp: string;
  let envBackup: string | undefined;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-patch-edge-'));
    envBackup = process.env.AMPLIFY_HOSTING_LENIENT_PATCHES;
    delete process.env.AMPLIFY_HOSTING_LENIENT_PATCHES;
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    if (envBackup === undefined) {
      delete process.env.AMPLIFY_HOSTING_LENIENT_PATCHES;
    } else {
      process.env.AMPLIFY_HOSTING_LENIENT_PATCHES = envBackup;
    }
  });

  void it('returns silently when there are no edge bundles', () => {
    fs.mkdirSync(path.join(tmp, 'server-functions', 'default'), {
      recursive: true,
    });
    assert.doesNotThrow(() => patchEdgeBundlesForLambdaEdge(tmp));
  });

  void it('throws UpstreamPatchPatternChangedError when bundles exist but banner is gone', () => {
    const dir = path.join(tmp, 'server-functions', 'edge-default');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'index.mjs'),
      'export const handler = async () => ({}); // no banner here\n',
    );
    assert.throws(
      () => patchEdgeBundlesForLambdaEdge(tmp),
      (error: Error) => error.name === 'UpstreamPatchPatternChangedError',
    );
  });

  void it('AMPLIFY_HOSTING_LENIENT_PATCHES=1 reverts to a warning', () => {
    const dir = path.join(tmp, 'server-functions', 'edge-default');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'index.mjs'),
      'export const handler = async () => ({});\n',
    );
    process.env.AMPLIFY_HOSTING_LENIENT_PATCHES = '1';
    assert.doesNotThrow(() => patchEdgeBundlesForLambdaEdge(tmp));
  });

  void it('successfully patches a bundle that has the banner', () => {
    const dir = path.join(tmp, 'server-functions', 'edge-default');
    fs.mkdirSync(dir, { recursive: true });
    const bundle = path.join(dir, 'index.mjs');
    fs.writeFileSync(
      bundle,
      'import * as process from "node:process";\nexport const handler = async () => ({});',
    );
    assert.doesNotThrow(() => patchEdgeBundlesForLambdaEdge(tmp));
    const patched = fs.readFileSync(bundle, 'utf-8');
    assert.match(
      patched,
      /const process = \(await import\("node:process"\)\)\.default;/,
    );
  });
});

void describe('detectEdgeRoutes — multi-matcher edge functions', () => {
  let tmp: string;
  let manifestPath: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-edge-mm-'));
    fs.mkdirSync(path.join(tmp, '.next', 'server'), { recursive: true });
    manifestPath = path.join(
      tmp,
      '.next',
      'server',
      'middleware-manifest.json',
    );
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  void it('emits one EdgeRoute per matcher (not just matchers[0])', async () => {
    // Next's matcher.originalSource carries path-to-regexp tokens
    // (`:path*`). The existing nextPatternToCloudFront translator
    // only collapses Next file-system tokens (`[name]`, `[...name]`),
    // so path-to-regexp passes through unchanged. The fix under test
    // is that ALL matchers (not just matchers[0]) are emitted.
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        functions: {
          'src/middleware': {
            name: 'src/middleware',
            matchers: [
              { originalSource: '/admin/:path*' },
              { originalSource: '/api/admin/:path*' },
              { originalSource: '/dashboard' },
            ],
          },
        },
      }),
    );
    const { detectEdgeRoutes } = await import('./nextjs.js');
    const routes = detectEdgeRoutes(tmp);
    assert.strictEqual(routes.length, 3, JSON.stringify(routes));
    const patterns = routes.map((r) => r.pattern).sort();
    assert.deepStrictEqual(
      patterns,
      ['/admin/:path*', '/api/admin/:path*', '/dashboard'].sort(),
    );
    assert.ok(routes.every((r) => r.module === 'src/middleware'));
  });

  void it('translates Next file-system tokens ([name] / [...name]) per matcher', async () => {
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        functions: {
          'src/middleware': {
            name: 'src/middleware',
            matchers: [
              { originalSource: '/api/[locale]/admin' },
              { originalSource: '/blog/[...slug]' },
            ],
          },
        },
      }),
    );
    const { detectEdgeRoutes } = await import('./nextjs.js');
    const routes = detectEdgeRoutes(tmp);
    assert.deepStrictEqual(routes.map((r) => r.pattern).sort(), [
      '/api/*/admin',
      '/blog/*',
    ]);
  });

  void it('skips matcher entries missing originalSource without dropping siblings', async () => {
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        functions: {
          'src/middleware': {
            name: 'src/middleware',
            matchers: [
              { originalSource: '/keep-me' },
              {
                /* malformed: no originalSource */
              },
              { originalSource: '/also-keep' },
            ],
          },
        },
      }),
    );
    const { detectEdgeRoutes } = await import('./nextjs.js');
    const routes = detectEdgeRoutes(tmp);
    assert.strictEqual(routes.length, 2);
    assert.deepStrictEqual(routes.map((r) => r.pattern).sort(), [
      '/also-keep',
      '/keep-me',
    ]);
  });

  void it('skips function entries without a name', async () => {
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        functions: {
          unnamed: { matchers: [{ originalSource: '/lost' }] },
          named: { name: 'named', matchers: [{ originalSource: '/found' }] },
        },
      }),
    );
    const { detectEdgeRoutes } = await import('./nextjs.js');
    const routes = detectEdgeRoutes(tmp);
    assert.strictEqual(routes.length, 1);
    assert.strictEqual(routes[0].pattern, '/found');
  });

  void it('returns [] when manifest is missing (no edge routes in project)', async () => {
    const { detectEdgeRoutes } = await import('./nextjs.js');
    assert.deepStrictEqual(detectEdgeRoutes(tmp), []);
  });

  void it('preserves existing single-matcher behavior', async () => {
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        functions: {
          'src/middleware': {
            name: 'src/middleware',
            matchers: [{ originalSource: '/api/edge/[id]' }],
          },
        },
      }),
    );
    const { detectEdgeRoutes } = await import('./nextjs.js');
    const routes = detectEdgeRoutes(tmp);
    assert.deepStrictEqual(routes, [
      { module: 'src/middleware', pattern: '/api/edge/*' },
    ]);
  });
});

void describe('stripNextInternalLocale — Pages Router i18n source rewrite', () => {
  void it('strips a locale group with a sub-path', () => {
    assert.strictEqual(
      stripNextInternalLocale(
        '/:nextInternalLocale(en|fr|es|ja)/secure-headers',
      ),
      '/secure-headers',
    );
  });

  void it('maps a bare locale-only source to /', () => {
    assert.strictEqual(
      stripNextInternalLocale('/:nextInternalLocale(en|fr|es|ja)'),
      '/',
    );
    assert.strictEqual(
      stripNextInternalLocale('/:nextInternalLocale(en|fr|es|ja)/'),
      '/',
    );
  });

  void it('preserves trailing wildcards', () => {
    assert.strictEqual(
      stripNextInternalLocale('/:nextInternalLocale(en|fr|es|ja)/api/edge/*'),
      '/api/edge/*',
    );
  });

  void it('passes non-i18n sources through unchanged', () => {
    assert.strictEqual(
      stripNextInternalLocale('/secure-headers'),
      '/secure-headers',
    );
    assert.strictEqual(stripNextInternalLocale('/'), '/');
    assert.strictEqual(stripNextInternalLocale('/api/edge/*'), '/api/edge/*');
  });

  void it('does not alter sources with other capture groups', () => {
    // No nextInternalLocale prefix — leave untouched.
    assert.strictEqual(
      stripNextInternalLocale('/:slug(foo|bar)'),
      '/:slug(foo|bar)',
    );
  });
});

void describe('nextjsAdapter — Pages Router i18n header lift', () => {
  let tmpDir: string;
  let lenientBackup: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-nextjs-i18n-'));
    mock.method(spawn, 'sync', () => undefined);
    lenientBackup = process.env.AMPLIFY_HOSTING_LENIENT_PATCHES;
    process.env.AMPLIFY_HOSTING_LENIENT_PATCHES = '1';
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    mock.restoreAll();
    if (lenientBackup === undefined) {
      delete process.env.AMPLIFY_HOSTING_LENIENT_PATCHES;
    } else {
      process.env.AMPLIFY_HOSTING_LENIENT_PATCHES = lenientBackup;
    }
  });

  /**
   * Build the minimal `.open-next/` + `.next/routes-manifest.json`
   * fixture that nextjsAdapter accepts. Caller passes the routes-manifest
   * contents.
   */
  const writeFixture = (routesManifest: object): void => {
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
        origins: { default: { type: 'function', handler: 'index.handler' } },
        behaviors: [{ pattern: '/*', origin: 'default' }],
        additionalProps: {},
      }),
    );
    const dotNextDir = path.join(tmpDir, '.next');
    fs.mkdirSync(dotNextDir, { recursive: true });
    fs.writeFileSync(
      path.join(dotNextDir, 'routes-manifest.json'),
      JSON.stringify(routesManifest),
    );
  };

  void it('lifts headers when the user has Pages Router i18n configured', () => {
    writeFixture({
      i18n: { locales: ['en', 'fr', 'es', 'ja'] },
      headers: [
        {
          source: '/:nextInternalLocale(en|fr|es|ja)/secure-headers',
          headers: [{ key: 'X-Frame-Options', value: 'DENY' }],
        },
      ],
    });
    const manifest = nextjsAdapter({ projectDir: tmpDir });
    assert.ok(manifest.headers, 'headers should be lifted');
    const lifted = manifest.headers!.find(
      (h) => h.source === '/secure-headers',
    );
    assert.ok(lifted, '/secure-headers should be lifted from the locale group');
    assert.strictEqual(lifted!.headers['X-Frame-Options'], 'DENY');
  });

  void it('lifts redirects with both source and destination locale-prefixed', () => {
    writeFixture({
      i18n: { locales: ['en', 'fr'] },
      redirects: [
        {
          source: '/:nextInternalLocale(en|fr)/old',
          destination: '/:nextInternalLocale(en|fr)/new',
          statusCode: 308,
        },
      ],
    });
    const manifest = nextjsAdapter({ projectDir: tmpDir });
    assert.ok(manifest.redirects, 'redirects should be lifted');
    const lifted = manifest.redirects!.find((r) => r.source === '/old');
    assert.ok(lifted);
    assert.strictEqual(lifted!.destination, '/new');
    assert.strictEqual(lifted!.statusCode, 308);
  });

  void it('does NOT strip the locale group when i18n is not configured', () => {
    // A header source carrying `:nextInternalLocale(...)` without an
    // `i18n.locales` block is unexpected — leave it as-is so it falls
    // through to OpenNext (defensive).
    writeFixture({
      headers: [
        {
          source: '/:nextInternalLocale(en|fr)/secure-headers',
          headers: [{ key: 'X-Frame-Options', value: 'DENY' }],
        },
      ],
    });
    const manifest = nextjsAdapter({ projectDir: tmpDir });
    assert.strictEqual(
      manifest.headers,
      undefined,
      'no headers should lift without i18n config',
    );
  });

  void it('passes through non-i18n header sources unchanged', () => {
    writeFixture({
      i18n: { locales: ['en', 'fr'] },
      headers: [
        {
          source: '/api/static',
          headers: [{ key: 'X-Custom', value: 'yes' }],
        },
      ],
    });
    const manifest = nextjsAdapter({ projectDir: tmpDir });
    assert.ok(manifest.headers);
    assert.strictEqual(manifest.headers!.length, 1);
    assert.strictEqual(manifest.headers![0].source, '/api/static');
  });
});

void describe('nextjsAdapter — incompatible open-next.config.ts', () => {
  let tmpDir: string;
  let lenientBackup: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-nextjs-config-'));
    mock.method(spawn, 'sync', () => undefined);
    lenientBackup = process.env.AMPLIFY_HOSTING_LENIENT_PATCHES;
    process.env.AMPLIFY_HOSTING_LENIENT_PATCHES = '1';
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    mock.restoreAll();
    if (lenientBackup === undefined) {
      delete process.env.AMPLIFY_HOSTING_LENIENT_PATCHES;
    } else {
      process.env.AMPLIFY_HOSTING_LENIENT_PATCHES = lenientBackup;
    }
  });

  void it('throws IncompatibleOpenNextConfigError when user config lacks both overrides', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'open-next.config.ts'),
      `// User-authored config, no overrides
const config = { default: {} };
export default config;
`,
    );
    assert.throws(() => nextjsAdapter({ projectDir: tmpDir }), {
      code: 'IncompatibleOpenNextConfigError',
    });
  });

  void it('throws when user config has converter override but is missing the streaming wrapper', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'open-next.config.ts'),
      `const config = {
  default: { override: { converter: 'aws-apigw-v1' } },
};
export default config;
`,
    );
    assert.throws(() => nextjsAdapter({ projectDir: tmpDir }), {
      code: 'IncompatibleOpenNextConfigError',
    });
  });

  void it('accepts a user config that contains both required override tokens', () => {
    // Set up minimum OpenNext output so the adapter doesn't fail
    // post-config-check on a missing build artefact.
    fs.writeFileSync(
      path.join(tmpDir, 'open-next.config.ts'),
      `const config = {
  default: { override: { converter: 'aws-apigw-v1', wrapper: 'aws-lambda-streaming' } },
};
export default config;
`,
    );
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
        origins: { default: { type: 'function', handler: 'index.handler' } },
        behaviors: [{ pattern: '/*', origin: 'default' }],
        additionalProps: {},
      }),
    );
    assert.doesNotThrow(() => nextjsAdapter({ projectDir: tmpDir }));
  });
});
