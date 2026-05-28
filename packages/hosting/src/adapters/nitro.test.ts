import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from './spawn.js';
import { nitroAdapter } from './nitro.js';

/**
 * Build a minimal `.output/` layout that nitroAdapter accepts. Caller
 * passes any extra files / overrides via `extras`.
 */
const writeMinimalNitroOutput = (
  projectDir: string,
  extras: {
    /** Contents of `.output/nitro.json`; omit for "no nitro.json". */
    nitroJson?: Record<string, unknown>;
    /**
     * Contents of `.output/server/chunks/nitro/nitro.mjs` (used to harvest
     *  bundled routeRules). Default: empty server bundle (no rules).
     */
    bundledRouteRules?: Record<string, unknown>;
  } = {},
): void => {
  const outputDir = path.join(projectDir, '.output');
  const serverDir = path.join(outputDir, 'server');
  const publicDir = path.join(outputDir, 'public');
  const chunksDir = path.join(serverDir, 'chunks', 'nitro');
  fs.mkdirSync(serverDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(chunksDir, { recursive: true });
  // Server entry — content doesn't matter, only existence.
  fs.writeFileSync(
    path.join(serverDir, 'index.mjs'),
    'export const handler = async () => {};',
  );
  // Bundled route rules — adapter scans this with a regex looking for
  // `"routeRules":` followed by a JSON object.
  const bundledRules = extras.bundledRouteRules ?? {};
  const bundleSource = `// nitro server bundle\n_inlineRuntimeConfig = { nitro: { "routeRules": ${JSON.stringify(bundledRules)} } };\n`;
  fs.writeFileSync(path.join(chunksDir, 'nitro.mjs'), bundleSource);
  // nitro.json — optional but commonly present.
  if (extras.nitroJson) {
    fs.writeFileSync(
      path.join(outputDir, 'nitro.json'),
      JSON.stringify(extras.nitroJson),
    );
  }
};

const writePackageJson = (
  projectDir: string,
  deps: Record<string, string> = {},
): void => {
  fs.writeFileSync(
    path.join(projectDir, 'package.json'),
    JSON.stringify({ name: 'fixture', dependencies: deps }),
  );
  // The nitro adapter probes installed packages (via local-pkg) for
  // @nuxt/image — synthesise the matching node_modules/<pkg>/ stubs
  // so the existing fixtures stay representative of "deps installed".
  for (const [name, spec] of Object.entries(deps)) {
    const numericMatch =
      typeof spec === 'string' ? spec.match(/(\d+)\.(\d+)\.(\d+)/) : null;
    const version = numericMatch
      ? `${numericMatch[1]}.${numericMatch[2]}.${numericMatch[3]}`
      : '1.0.0';
    const pkgDir = path.join(projectDir, 'node_modules', ...name.split('/'));
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name, version, main: 'index.js' }),
    );
    fs.writeFileSync(path.join(pkgDir, 'index.js'), '');
  }
};

const writeNuxtConfig = (projectDir: string, source: string): void => {
  fs.writeFileSync(path.join(projectDir, 'nuxt.config.ts'), source);
};

void describe('nitroAdapter — cache provisioning', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-nitro-cache-'));
    mock.method(spawn, 'sync', () => undefined);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    mock.restoreAll();
  });

  void it('does NOT provision cache for vanilla Nuxt (only framework-default cache: false rules)', () => {
    // Mirrors what real Nuxt 4 emits for a project with no user route
    // rules: just the built-in `__nuxt_error: { cache: false }`.
    writeMinimalNitroOutput(tmpDir, {
      bundledRouteRules: {
        '/__nuxt_error': { cache: false },
      },
    });
    writePackageJson(tmpDir, { nuxt: '^4.0.0' });

    const manifest = nitroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(
      manifest.cache,
      undefined,
      'cache: false is the framework default and must not trigger cache provisioning',
    );
  });

  void it('provisions cache when user sets swr: <number>', () => {
    writeMinimalNitroOutput(tmpDir, {
      bundledRouteRules: {
        '/__nuxt_error': { cache: false },
        '/news': { swr: 60 },
      },
    });
    writePackageJson(tmpDir, { nuxt: '^4.0.0' });

    const manifest = nitroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.ok(manifest.cache, 'truthy swr must trigger cache provisioning');
    assert.strictEqual(manifest.cache.driver, 'nitro-s3');
    assert.strictEqual(manifest.cache.computeResource, 'default');
  });

  void it('does NOT provision cache when swr: 0 (falsy override)', () => {
    writeMinimalNitroOutput(tmpDir, {
      bundledRouteRules: {
        '/news': { swr: 0 },
      },
    });
    writePackageJson(tmpDir, { nuxt: '^4.0.0' });

    const manifest = nitroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(manifest.cache, undefined);
  });

  void it('provisions cache when user sets isr: true', () => {
    writeMinimalNitroOutput(tmpDir, {
      bundledRouteRules: {
        '/blog/**': { isr: true },
      },
    });
    writePackageJson(tmpDir, { nuxt: '^4.0.0' });

    const manifest = nitroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.ok(manifest.cache);
    assert.strictEqual(manifest.cache.driver, 'nitro-s3');
  });
});

void describe('nitroAdapter — IPX provisioning', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-nitro-ipx-'));
    mock.method(spawn, 'sync', () => undefined);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    mock.restoreAll();
  });

  void it('provisions IPX Lambda when @nuxt/image is in deps and config is default', () => {
    writeMinimalNitroOutput(tmpDir);
    writePackageJson(tmpDir, {
      nuxt: '^4.0.0',
      '@nuxt/image': '^2.0.0',
    });

    const manifest = nitroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.ok(
      manifest.imageOptimization,
      'IPX Lambda should be provisioned when @nuxt/image is present',
    );
    assert.strictEqual(manifest.imageOptimization.baseURL, '/_ipx');
    assert.strictEqual(
      manifest.imageOptimization.environment,
      undefined,
      'IPX_BASE_URL env var should be omitted when using the default path',
    );
    // Route at the default IPX path should be present.
    const ipxRoute = manifest.routes.find(
      (r) => r.target === 'image-optimization',
    );
    assert.ok(ipxRoute, 'a route targeting image-optimization must exist');
    assert.strictEqual(ipxRoute.pattern, '/_ipx/*');
  });

  void it('does NOT provision IPX Lambda when @nuxt/image is missing', () => {
    writeMinimalNitroOutput(tmpDir);
    writePackageJson(tmpDir, { nuxt: '^4.0.0' });

    const manifest = nitroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(manifest.imageOptimization, undefined);
    const ipxRoute = manifest.routes.find(
      (r) => r.target === 'image-optimization',
    );
    assert.strictEqual(ipxRoute, undefined);
  });

  void it('does NOT provision IPX Lambda when @nuxt/image is declared but never installed (no node_modules)', () => {
    writeMinimalNitroOutput(tmpDir);
    // Manually write package.json *without* the writePackageJson helper
    // so node_modules/@nuxt/image is NOT created — this is the bug
    // local-pkg fixes (declared deps that were never `npm install`-ed
    // would have shipped a dangling 50 MB IPX Lambda).
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'fixture',
        dependencies: { nuxt: '^4.0.0', '@nuxt/image': '^2.0.0' },
      }),
    );
    const manifest = nitroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(
      manifest.imageOptimization,
      undefined,
      'image-opt Lambda must NOT be provisioned for declared-but-not-installed @nuxt/image',
    );
  });

  void it('does NOT provision IPX Lambda when image: false', () => {
    writeMinimalNitroOutput(tmpDir);
    writePackageJson(tmpDir, {
      nuxt: '^4.0.0',
      '@nuxt/image': '^2.0.0',
    });
    writeNuxtConfig(
      tmpDir,
      `export default defineNuxtConfig({ image: false });`,
    );

    const manifest = nitroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(
      manifest.imageOptimization,
      undefined,
      'image: false must skip the IPX Lambda even if @nuxt/image is in deps',
    );
  });

  void it("does NOT provision IPX Lambda when image: { provider: 'none' }", () => {
    writeMinimalNitroOutput(tmpDir);
    writePackageJson(tmpDir, {
      nuxt: '^4.0.0',
      '@nuxt/image': '^2.0.0',
    });
    writeNuxtConfig(
      tmpDir,
      `export default defineNuxtConfig({
         image: { provider: 'none' },
       });`,
    );

    const manifest = nitroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(manifest.imageOptimization, undefined);
  });

  void it("does NOT provision IPX Lambda when provider is a third-party CDN (e.g. 'cloudinary')", () => {
    writeMinimalNitroOutput(tmpDir);
    writePackageJson(tmpDir, {
      nuxt: '^4.0.0',
      '@nuxt/image': '^2.0.0',
    });
    writeNuxtConfig(
      tmpDir,
      `export default defineNuxtConfig({
         image: { provider: 'cloudinary', cloudinary: { baseURL: '...' } },
       });`,
    );

    const manifest = nitroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(
      manifest.imageOptimization,
      undefined,
      'non-IPX providers route to the third-party CDN; the Lambda is dead code',
    );
  });

  void it("provisions IPX Lambda when provider is 'ipx' explicitly", () => {
    writeMinimalNitroOutput(tmpDir);
    writePackageJson(tmpDir, {
      nuxt: '^4.0.0',
      '@nuxt/image': '^2.0.0',
    });
    writeNuxtConfig(
      tmpDir,
      `export default defineNuxtConfig({
         image: { provider: 'ipx' },
       });`,
    );

    const manifest = nitroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.ok(manifest.imageOptimization);
  });

  void it("provisions IPX Lambda when provider is 'ipxStatic'", () => {
    writeMinimalNitroOutput(tmpDir);
    writePackageJson(tmpDir, {
      nuxt: '^4.0.0',
      '@nuxt/image': '^2.0.0',
    });
    writeNuxtConfig(
      tmpDir,
      `export default defineNuxtConfig({
         image: { provider: 'ipxStatic' },
       });`,
    );

    const manifest = nitroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.ok(manifest.imageOptimization);
  });
});

void describe('nitroAdapter — IPX baseURL plumbing', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-nitro-baseurl-'));
    mock.method(spawn, 'sync', () => undefined);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    mock.restoreAll();
  });

  void it('respects user-configured runtimeConfig.ipx.baseURL', () => {
    writeMinimalNitroOutput(tmpDir);
    writePackageJson(tmpDir, {
      nuxt: '^4.0.0',
      '@nuxt/image': '^2.0.0',
    });
    writeNuxtConfig(
      tmpDir,
      `export default defineNuxtConfig({
         runtimeConfig: { ipx: { baseURL: '/img-cdn' } },
       });`,
    );

    const manifest = nitroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.ok(manifest.imageOptimization);
    assert.strictEqual(manifest.imageOptimization.baseURL, '/img-cdn');
    assert.deepStrictEqual(
      manifest.imageOptimization.environment,
      { IPX_BASE_URL: '/img-cdn' },
      'custom baseURL must be passed to the Lambda via IPX_BASE_URL env var',
    );
    // Route pattern reflects the configured path.
    const ipxRoute = manifest.routes.find(
      (r) => r.target === 'image-optimization',
    );
    assert.ok(ipxRoute);
    assert.strictEqual(ipxRoute.pattern, '/img-cdn/*');
  });

  void it('handles trailing slash on user baseURL', () => {
    writeMinimalNitroOutput(tmpDir);
    writePackageJson(tmpDir, {
      nuxt: '^4.0.0',
      '@nuxt/image': '^2.0.0',
    });
    writeNuxtConfig(
      tmpDir,
      `export default defineNuxtConfig({
         runtimeConfig: { ipx: { baseURL: '/img-cdn/' } },
       });`,
    );

    const manifest = nitroAdapter({ projectDir: tmpDir, skipBuild: true });
    // Note: the regex captures up to the closing quote, so trailing slash
    // is preserved in `baseURL` itself; the route-pattern build trims it
    // before appending /*.
    assert.strictEqual(manifest.imageOptimization?.baseURL, '/img-cdn/');
    const ipxRoute = manifest.routes.find(
      (r) => r.target === 'image-optimization',
    );
    assert.strictEqual(
      ipxRoute?.pattern,
      '/img-cdn/*',
      'trailing slash on baseURL must not double-up in the route pattern',
    );
  });

  void it('falls back to /_ipx when nuxt.config has no runtimeConfig.ipx.baseURL', () => {
    writeMinimalNitroOutput(tmpDir);
    writePackageJson(tmpDir, {
      nuxt: '^4.0.0',
      '@nuxt/image': '^2.0.0',
    });
    writeNuxtConfig(
      tmpDir,
      `export default defineNuxtConfig({
         runtimeConfig: { someOtherKey: 'whatever' },
       });`,
    );

    const manifest = nitroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(manifest.imageOptimization?.baseURL, '/_ipx');
    assert.strictEqual(
      manifest.imageOptimization?.environment,
      undefined,
      'environment override should be omitted for the default path',
    );
  });
});
