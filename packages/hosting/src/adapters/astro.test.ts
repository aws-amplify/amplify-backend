import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { astroAdapter } from './astro.js';
import { deployManifestSchema } from '../manifest/schema.js';

const writePkg = (
  dir: string,
  pkg: Record<string, unknown>,
  extraScripts: Record<string, string> = {},
): void => {
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'astro-fixture', scripts: extraScripts, ...pkg }),
  );
  // local-pkg's `getPackageInfoSync` resolves via Node module resolution.
  // The version gate now reads `node_modules/astro/package.json#version`
  // — synthesise it from the declared spec range so legacy tests pass.
  const deps = (pkg.dependencies ?? pkg.devDependencies ?? {}) as Record<
    string,
    string
  >;
  for (const [name, spec] of Object.entries(deps)) {
    if (typeof spec !== 'string') continue;
    const numericMatch = spec.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!numericMatch) continue;
    const installed = `${numericMatch[1]}.${numericMatch[2]}.${numericMatch[3]}`;
    const pkgDir = path.join(dir, 'node_modules', ...name.split('/'));
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name, version: installed, main: 'index.js' }),
    );
    fs.writeFileSync(path.join(pkgDir, 'index.js'), '');
  }
};

const writeStaticBuild = (
  projectDir: string,
  files: Record<string, string> = {},
): void => {
  const dist = path.join(projectDir, 'dist');
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), '<html>home</html>');
  fs.mkdirSync(path.join(dist, '_astro'), { recursive: true });
  fs.writeFileSync(path.join(dist, '_astro', 'app.abc123.js'), 'export {}');
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(dist, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
};

const writeServerBuild = (
  projectDir: string,
  opts: {
    middleware?: boolean;
    imageEndpoint?: boolean;
    prerendered?: string[];
  } = {},
): void => {
  const client = path.join(projectDir, 'dist', 'client');
  const server = path.join(projectDir, 'dist', 'server');
  fs.mkdirSync(client, { recursive: true });
  fs.mkdirSync(path.join(client, '_astro'), { recursive: true });
  fs.writeFileSync(path.join(client, '_astro', 'main.css'), 'body{}');
  fs.writeFileSync(path.join(client, 'index.html'), '<html>home</html>');
  for (const route of opts.prerendered ?? []) {
    const file = path.join(client, route, 'index.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `<html>${route}</html>`);
  }
  fs.mkdirSync(server, { recursive: true });
  fs.writeFileSync(
    path.join(server, 'entry.mjs'),
    'export const handler = async () => ({});',
  );
  if (opts.middleware) {
    fs.writeFileSync(
      path.join(server, '_astro-internal_middleware.mjs'),
      'export const onRequest = async () => ({});',
    );
  }
  fs.writeFileSync(
    path.join(server, 'manifest_abc.mjs'),
    `export const manifest = ${JSON.stringify({
      routes: opts.imageEndpoint
        ? [{ route: '/_image', type: 'endpoint' }]
        : [],
    })};`,
  );
};

void describe('astroAdapter — version gating', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-astro-ver-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('throws when astro is not installed', () => {
    writePkg(tmpDir, { dependencies: {} });
    assert.throws(
      () => astroAdapter({ projectDir: tmpDir, skipBuild: true }),
      (error: Error) =>
        error.name === 'UnsupportedAstroVersionError' &&
        /astro is not installed/.test(error.message),
    );
  });

  void it('throws when astro is declared in package.json but never installed (npm install skipped)', () => {
    // package.json claims astro@^5.0.0, but no node_modules/astro/.
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'fixture',
        dependencies: { astro: '^5.0.0' },
      }),
    );
    writeStaticBuild(tmpDir);
    assert.throws(
      () => astroAdapter({ projectDir: tmpDir, skipBuild: true }),
      (error: Error) =>
        error.name === 'UnsupportedAstroVersionError' &&
        /astro is not installed/.test(error.message),
    );
  });

  void it('uses the INSTALLED astro version, not the spec range (drift between package.json ^4.0.0 and node_modules/astro@3.2.0 must fail)', () => {
    // The spec says ^4.0.0 — under the old detector that would have
    // passed. The installed version is 3.2.0 — local-pkg reads that
    // and the version gate fails. This is the bug we're fixing.
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'fixture',
        dependencies: { astro: '^4.0.0' },
      }),
    );
    const astroDir = path.join(tmpDir, 'node_modules', 'astro');
    fs.mkdirSync(astroDir, { recursive: true });
    fs.writeFileSync(
      path.join(astroDir, 'package.json'),
      JSON.stringify({ name: 'astro', version: '3.2.0', main: 'index.js' }),
    );
    fs.writeFileSync(path.join(astroDir, 'index.js'), '');
    writeStaticBuild(tmpDir);
    assert.throws(
      () => astroAdapter({ projectDir: tmpDir, skipBuild: true }),
      (error: Error) =>
        error.name === 'UnsupportedAstroVersionError' &&
        /installed version is 3\.2\.0/.test(error.message),
    );
  });

  void it('accepts non-semver spec ranges (workspace:* / file:../fork) when the installed version is real', () => {
    // The user's spec is `workspace:*` (pnpm) — semver.coerce returned
    // null before, blocking legitimate users. local-pkg reads the
    // real version from disk and accepts.
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'fixture',
        dependencies: { astro: 'workspace:*' },
      }),
    );
    const astroDir = path.join(tmpDir, 'node_modules', 'astro');
    fs.mkdirSync(astroDir, { recursive: true });
    fs.writeFileSync(
      path.join(astroDir, 'package.json'),
      JSON.stringify({ name: 'astro', version: '5.4.1', main: 'index.js' }),
    );
    fs.writeFileSync(path.join(astroDir, 'index.js'), '');
    writeStaticBuild(tmpDir);
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(manifest.version, 1);
  });

  void it('throws when astro version is below 4.0', () => {
    writePkg(tmpDir, { dependencies: { astro: '^3.5.0' } });
    writeStaticBuild(tmpDir);
    assert.throws(
      () => astroAdapter({ projectDir: tmpDir, skipBuild: true }),
      (error: Error) => error.name === 'UnsupportedAstroVersionError',
    );
  });

  void it('accepts astro 4.0+', () => {
    writePkg(tmpDir, { dependencies: { astro: '^4.0.0' } });
    writeStaticBuild(tmpDir);
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(manifest.version, 1);
  });

  void it('accepts astro 5.x', () => {
    writePkg(tmpDir, { dependencies: { astro: '^5.0.0' } });
    writeStaticBuild(tmpDir);
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(manifest.version, 1);
  });
});

void describe("astroAdapter — output: 'static'", () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-astro-static-'));
    writePkg(tmpDir, { dependencies: { astro: '^5.0.0' } });
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('emits a static-only manifest with /* → static catch-all', () => {
    writeStaticBuild(tmpDir);
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.deepStrictEqual(manifest.compute, {});
    assert.strictEqual(manifest.routes.length, 1);
    assert.deepStrictEqual(manifest.routes[0], {
      pattern: '/*',
      target: 'static',
    });
    assert.strictEqual(
      manifest.staticAssets.directory,
      path.join(tmpDir, 'dist'),
    );
    const result = deployManifestSchema.safeParse(manifest);
    assert.ok(result.success, 'manifest must validate against schema');
  });

  void it('detects 404.html and 500.html error pages', () => {
    writeStaticBuild(tmpDir, {
      '404.html': '<html>404</html>',
      '500.html': '<html>500</html>',
    });
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.deepStrictEqual(manifest.errorPages, {
      404: '/404.html',
      500: '/500.html',
    });
  });

  void it('throws AstroBuildOutputMissingError when dist is empty', () => {
    fs.mkdirSync(path.join(tmpDir, 'dist'), { recursive: true });
    assert.throws(
      () => astroAdapter({ projectDir: tmpDir, skipBuild: true }),
      (error: Error) => error.name === 'AstroBuildOutputMissingError',
    );
  });

  void it('strips pre-compressed siblings (.gz / .br)', () => {
    writeStaticBuild(tmpDir, {
      'app.js.gz': 'gz',
      'app.js.br': 'br',
      'app.js': 'js',
    });
    astroAdapter({ projectDir: tmpDir, skipBuild: true });
    const dist = path.join(tmpDir, 'dist');
    assert.ok(!fs.existsSync(path.join(dist, 'app.js.gz')));
    assert.ok(!fs.existsSync(path.join(dist, 'app.js.br')));
    assert.ok(fs.existsSync(path.join(dist, 'app.js')));
  });
});

void describe("astroAdapter — output: 'server'", () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-astro-server-'));
    writePkg(tmpDir, { dependencies: { astro: '^5.0.0' } });
    fs.writeFileSync(
      path.join(tmpDir, 'astro.config.mjs'),
      "export default { output: 'server' };",
    );
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('emits compute.default as http-server (LWA) on nodejs20.x', () => {
    writeServerBuild(tmpDir);
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.ok(manifest.compute.default, 'compute.default required');
    assert.strictEqual(manifest.compute.default.type, 'http-server');
    assert.strictEqual(manifest.compute.default.runtime, 'nodejs20.x');
    assert.strictEqual(
      manifest.compute.default.entrypoint,
      path.posix.join('server', 'run.sh'),
    );
    assert.strictEqual(manifest.compute.default.port, 3000);
    // bundle: dist/ so the Lambda zip has server/ + client/ as siblings —
    // @astrojs/node walks from import.meta.url for that layout.
    assert.strictEqual(
      manifest.compute.default.bundle,
      path.join(tmpDir, 'dist'),
    );
    assert.strictEqual(
      manifest.staticAssets.directory,
      path.join(tmpDir, 'dist', 'client'),
    );
    const runSh = path.join(tmpDir, 'dist', 'server', 'run.sh');
    assert.ok(
      fs.existsSync(runSh),
      'run.sh must be written into server bundle',
    );
    assert.match(fs.readFileSync(runSh, 'utf-8'), /node entry\.mjs/);
  });

  void it('routes /_astro/* to static and catches all to default', () => {
    writeServerBuild(tmpDir);
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    const patterns = manifest.routes.map((r) => `${r.pattern}→${r.target}`);
    assert.ok(patterns.includes('/_astro/*→static'));
    assert.strictEqual(
      manifest.routes[manifest.routes.length - 1].pattern,
      '/*',
    );
    assert.strictEqual(
      manifest.routes[manifest.routes.length - 1].target,
      'default',
    );
  });

  void it('does NOT emit manifest.middleware (Astro middleware ships inside entry.mjs)', () => {
    // Setting manifest.middleware would tell the L3 to provision a
    // separate Lambda@Edge viewer-request association, which collides
    // with the CloudFront Function the L3 already wires for asset-prefix
    // / build-id rewrites. Astro middleware runs in the regional SSR
    // Lambda — leave it there.
    writeServerBuild(tmpDir, { middleware: true });
    const withMw = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(withMw.middleware, undefined);

    // Same expectation when no middleware bundle exists.
    fs.rmSync(path.join(tmpDir, 'dist'), { recursive: true, force: true });
    writeServerBuild(tmpDir, { middleware: false });
    const withoutMw = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(withoutMw.middleware, undefined);
  });

  void it('detects built-in image endpoint and emits image-opt config', () => {
    writeServerBuild(tmpDir, { imageEndpoint: true });
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.ok(manifest.imageOptimization);
    assert.strictEqual(manifest.imageOptimization!.baseURL, '/_image');
    assert.deepStrictEqual(manifest.imageOptimization!.formats, [
      'webp',
      'avif',
    ]);
  });

  void it('passes image.domains from astro.config through to the manifest', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'astro.config.mjs'),
      "export default { output: 'server', image: { domains: ['cdn.example.com'] } };",
    );
    writeServerBuild(tmpDir, { imageEndpoint: true });
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.deepStrictEqual(manifest.imageOptimization!.domains, [
      'cdn.example.com',
    ]);
  });

  void it('throws when entry.mjs is missing', () => {
    fs.mkdirSync(path.join(tmpDir, 'dist', 'client'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'dist', 'client', 'index.html'),
      '<html></html>',
    );
    fs.mkdirSync(path.join(tmpDir, 'dist', 'server'), { recursive: true });
    assert.throws(
      () => astroAdapter({ projectDir: tmpDir, skipBuild: true }),
      (error: Error) => error.name === 'AstroBuildOutputMissingError',
    );
  });

  void it('produces a schema-valid manifest', () => {
    writeServerBuild(tmpDir, { middleware: true, imageEndpoint: true });
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    const result = deployManifestSchema.safeParse(manifest);
    assert.ok(
      result.success,
      `manifest must validate: ${result.success ? '' : JSON.stringify(result.error.issues)}`,
    );
  });
});

void describe("astroAdapter — output: 'hybrid'", () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-astro-hybrid-'));
    writePkg(tmpDir, { dependencies: { astro: '^5.0.0' } });
    fs.writeFileSync(
      path.join(tmpDir, 'astro.config.mjs'),
      "export default { output: 'hybrid' };",
    );
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('emits explicit static routes for prerendered pages', () => {
    writeServerBuild(tmpDir, { prerendered: ['about', 'blog'] });
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    const patterns = manifest.routes.map((r) => r.pattern);
    assert.ok(patterns.includes('/about/*'));
    assert.ok(patterns.includes('/about'));
    assert.ok(patterns.includes('/blog/*'));
    assert.ok(patterns.includes('/blog'));
    assert.strictEqual(patterns[patterns.length - 1], '/*');
  });

  void it("trailingSlash: 'always' appends / to bare prerendered routes", () => {
    fs.writeFileSync(
      path.join(tmpDir, 'astro.config.mjs'),
      "export default { output: 'hybrid', trailingSlash: 'always' };",
    );
    writeServerBuild(tmpDir, { prerendered: ['about'] });
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    const patterns = manifest.routes.map((r) => r.pattern);
    assert.ok(patterns.includes('/about/'));
  });
});

void describe('astroAdapter — config loading edge cases', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-astro-cfg-'));
    writePkg(tmpDir, { dependencies: { astro: '^5.0.0' } });
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('falls back to static defaults when astro.config is missing', () => {
    writeStaticBuild(tmpDir);
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(manifest.routes[0].pattern, '/*');
    assert.deepStrictEqual(manifest.compute, {});
  });

  void it('falls back to defaults when astro.config throws on import', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'astro.config.mjs'),
      'throw new Error("boom"); export default {};',
    );
    writeStaticBuild(tmpDir);
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(manifest.routes[0].pattern, '/*');
  });
});
