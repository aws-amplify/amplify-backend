import { describe, it } from 'node:test';
import assert from 'node:assert';
import { deployManifestSchema } from './schema.js';
import { DeployManifest } from './types.js';

void describe('Deploy Manifest Schema', () => {
  void it('validates a valid SPA manifest', () => {
    const manifest: DeployManifest = {
      version: 1,
      compute: {},
      staticAssets: { directory: '/tmp/assets' },
      routes: [
        {
          pattern: '/*',
          target: 'static',
        },
      ],
    };

    const result = deployManifestSchema.safeParse(manifest);
    assert.ok(result.success, 'Valid SPA manifest should parse');
    assert.deepStrictEqual(result.data, manifest);
  });

  void it('validates a valid SSR manifest with compute resources', () => {
    const manifest: DeployManifest = {
      version: 1,
      compute: {
        default: {
          type: 'handler',
          bundle: '/tmp/bundle',
          handler: 'index.handler',
          placement: 'regional',
          streaming: true,
          runtime: 'nodejs20.x',
        },
      },
      staticAssets: { directory: '/tmp/assets' },
      routes: [
        { pattern: '/_next/static/*', target: 'static' },
        { pattern: '/*', target: 'default' },
      ],
      buildId: 'abc123',
    };

    const result = deployManifestSchema.safeParse(manifest);
    assert.ok(result.success, 'Valid SSR manifest should parse');
  });

  void it('validates manifest with cache config', () => {
    const manifest: DeployManifest = {
      version: 1,
      compute: {
        default: {
          type: 'handler',
          bundle: '/tmp/bundle',
          handler: 'index.handler',
          placement: 'regional',
        },
      },
      staticAssets: { directory: '/tmp/assets' },
      routes: [{ pattern: '/*', target: 'default' }],
      cache: {
        computeResource: 'default',
        tagRevalidation: true,
        revalidationQueue: true,
      },
    };

    const result = deployManifestSchema.safeParse(manifest);
    assert.ok(result.success, 'Manifest with cache config should parse');
  });

  void it('validates manifest with image optimization', () => {
    const manifest: DeployManifest = {
      version: 1,
      compute: {},
      staticAssets: { directory: '/tmp/assets' },
      routes: [{ pattern: '/*', target: 'static' }],
      imageOptimization: {
        bundle: '/tmp/image-fn',
        handler: 'index.handler',
        formats: ['webp', 'avif'],
        sizes: [640, 1080, 1920],
      },
    };

    const result = deployManifestSchema.safeParse(manifest);
    assert.ok(result.success, 'Manifest with image optimization should parse');
  });

  void it('validates manifest with middleware', () => {
    const manifest: DeployManifest = {
      version: 1,
      compute: {},
      staticAssets: { directory: '/tmp/assets' },
      routes: [{ pattern: '/*', target: 'static' }],
      middleware: {
        bundle: '/tmp/middleware',
        handler: 'handler.handler',
        matchers: ['/*'],
      },
    };

    const result = deployManifestSchema.safeParse(manifest);
    assert.ok(result.success, 'Manifest with middleware should parse');
  });

  void it('rejects manifest with wrong version', () => {
    const result = deployManifestSchema.safeParse({
      version: 2,
      compute: {},
      staticAssets: { directory: '/tmp/assets' },
      routes: [{ pattern: '/*', target: 'static' }],
    });
    assert.ok(!result.success, 'Should reject version != 1');
  });

  void it('rejects manifest with no routes', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      compute: {},
      staticAssets: { directory: '/tmp/assets' },
      routes: [],
    });
    assert.ok(!result.success, 'Should reject empty routes');
  });

  void it('rejects route with empty pattern', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      compute: {},
      staticAssets: { directory: '/tmp/assets' },
      routes: [{ pattern: '', target: 'static' }],
    });
    assert.ok(!result.success, 'Should reject empty pattern');
  });

  void it('rejects route with empty target', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      compute: {},
      staticAssets: { directory: '/tmp/assets' },
      routes: [{ pattern: '/*', target: '' }],
    });
    assert.ok(!result.success, 'Should reject empty target');
  });

  void it('rejects compute resource with invalid type', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      compute: {
        default: {
          type: 'invalid',
          bundle: '/tmp/bundle',
          placement: 'regional',
        },
      },
      staticAssets: { directory: '/tmp/assets' },
      routes: [{ pattern: '/*', target: 'default' }],
    });
    assert.ok(!result.success, 'Should reject invalid compute type');
  });

  void it('rejects compute resource with invalid placement', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      compute: {
        default: {
          type: 'handler',
          bundle: '/tmp/bundle',
          placement: 'somewhere',
        },
      },
      staticAssets: { directory: '/tmp/assets' },
      routes: [{ pattern: '/*', target: 'default' }],
    });
    assert.ok(!result.success, 'Should reject invalid placement');
  });

  void it('accepts manifest with all optional fields omitted', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      compute: {},
      staticAssets: { directory: '/tmp/assets' },
      routes: [{ pattern: '/*', target: 'static' }],
    });
    assert.ok(
      result.success,
      'Should accept manifest with only required fields',
    );
    assert.strictEqual(result.data?.cache, undefined);
    assert.strictEqual(result.data?.imageOptimization, undefined);
    assert.strictEqual(result.data?.middleware, undefined);
    assert.strictEqual(result.data?.buildId, undefined);
  });

  void it('validates http-server compute type', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      compute: {
        default: {
          type: 'http-server',
          bundle: '/tmp/bundle',
          entrypoint: 'server.js',
          port: 3000,
          placement: 'regional',
        },
      },
      staticAssets: { directory: '/tmp/assets' },
      routes: [{ pattern: '/*', target: 'default' }],
    });
    assert.ok(result.success, 'Should accept http-server compute type');
  });

  void it('validates edge compute type', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      compute: {
        default: {
          type: 'edge',
          bundle: '/tmp/bundle',
          handler: 'index.handler',
          placement: 'global',
        },
      },
      staticAssets: { directory: '/tmp/assets' },
      routes: [{ pattern: '/*', target: 'default' }],
    });
    assert.ok(result.success, 'Should accept edge compute type');
  });

  void it('validates redirects', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      compute: {},
      staticAssets: { directory: '/tmp/assets' },
      routes: [{ pattern: '/*', target: 'static' }],
      redirects: [
        { source: '/old', destination: '/new', statusCode: 301 },
        { source: '/temp', destination: '/other', statusCode: 302 },
      ],
    });
    assert.ok(result.success, 'Should accept valid redirects');
  });

  void it('validates rewrites', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      compute: {},
      staticAssets: { directory: '/tmp/assets' },
      routes: [{ pattern: '/*', target: 'static' }],
      rewrites: [{ source: '/api/*', destination: '/api/handler' }],
    });
    assert.ok(result.success, 'Should accept valid rewrites');
  });

  void it('validates custom headers', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      compute: {},
      staticAssets: { directory: '/tmp/assets' },
      routes: [{ pattern: '/*', target: 'static' }],
      headers: [{ source: '/*', headers: { 'X-Custom': 'value' } }],
    });
    assert.ok(result.success, 'Should accept valid custom headers');
  });
});
