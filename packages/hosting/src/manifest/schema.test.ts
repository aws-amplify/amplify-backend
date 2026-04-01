import { describe, it } from 'node:test';
import assert from 'node:assert';
import { deployManifestSchema } from './schema.js';
import { DeployManifest } from './types.js';

void describe('Deploy Manifest Schema', () => {
  void it('validates a valid SPA manifest', () => {
    const manifest: DeployManifest = {
      version: 1,
      routes: [
        {
          path: '/*',
          target: {
            kind: 'Static',
            cacheControl: 'public, max-age=0, must-revalidate',
          },
        },
      ],
      framework: { name: 'spa', version: '1.0.0' },
    };

    const result = deployManifestSchema.safeParse(manifest);
    assert.ok(result.success, 'Valid SPA manifest should parse');
    assert.deepStrictEqual(result.data, manifest);
  });

  void it('validates a valid SSR manifest with compute resources', () => {
    const manifest: DeployManifest = {
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
        { name: 'default', runtime: 'nodejs20.x', entrypoint: 'server.js' },
      ],
      framework: { name: 'nextjs', version: '15.1.0' },
      buildId: 'abc123',
    };

    const result = deployManifestSchema.safeParse(manifest);
    assert.ok(result.success, 'Valid SSR manifest should parse');
  });

  void it('rejects manifest with wrong version', () => {
    const result = deployManifestSchema.safeParse({
      version: 2,
      routes: [{ path: '/*', target: { kind: 'Static' } }],
      framework: { name: 'spa' },
    });
    assert.ok(!result.success, 'Should reject version != 1');
  });

  void it('rejects manifest with no routes', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      routes: [],
      framework: { name: 'spa' },
    });
    assert.ok(!result.success, 'Should reject empty routes');
    const routeIssue = result.error?.issues.find((i) =>
      i.path.includes('routes'),
    );
    assert.ok(routeIssue, 'Error should reference routes field');
  });

  void it('rejects route with path not starting with /', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      routes: [{ path: 'invalid', target: { kind: 'Static' } }],
      framework: { name: 'spa' },
    });
    assert.ok(!result.success, 'Should reject path not starting with /');
  });

  void it('rejects route with invalid target kind', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      routes: [{ path: '/*', target: { kind: 'Unknown' } }],
      framework: { name: 'spa' },
    });
    assert.ok(!result.success, 'Should reject unknown target kind');
  });

  void it('rejects manifest with missing framework', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      routes: [{ path: '/*', target: { kind: 'Static' } }],
    });
    assert.ok(!result.success, 'Should reject missing framework');
  });

  void it('rejects manifest with empty framework name', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      routes: [{ path: '/*', target: { kind: 'Static' } }],
      framework: { name: '' },
    });
    assert.ok(!result.success, 'Should reject empty framework name');
  });

  void it('accepts manifest with optional fields omitted', () => {
    const result = deployManifestSchema.safeParse({
      version: 1,
      routes: [{ path: '/*', target: { kind: 'Static' } }],
      framework: { name: 'static' },
    });
    assert.ok(
      result.success,
      'Should accept manifest with only required fields',
    );
    assert.strictEqual(result.data?.computeResources, undefined);
    assert.strictEqual(result.data?.buildId, undefined);
  });
});
