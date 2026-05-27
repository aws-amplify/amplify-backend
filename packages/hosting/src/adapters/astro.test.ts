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
      path.join(server, '_middleware.mjs'),
      'export const handler = async () => ({});',
    );
  }
  fs.writeFileSync(
    path.join(server, 'manifest_abc.json'),
    JSON.stringify({
      routes: opts.imageEndpoint
        ? [{ route: '/_astro/_image', type: 'endpoint' }]
        : [],
    }),
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

  void it('throws when astro is not in deps', () => {
    writePkg(tmpDir, { dependencies: {} });
    assert.throws(
      () => astroAdapter({ projectDir: tmpDir, skipBuild: true }),
      (error: Error) =>
        error.name === 'UnsupportedAstroVersionError' &&
        /no astro dependency/.test(error.message),
    );
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

  void it('emits compute.default with streaming + nodejs20.x', () => {
    writeServerBuild(tmpDir);
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.ok(manifest.compute.default, 'compute.default required');
    assert.strictEqual(manifest.compute.default.type, 'handler');
    assert.strictEqual(manifest.compute.default.streaming, true);
    assert.strictEqual(manifest.compute.default.runtime, 'nodejs20.x');
    assert.strictEqual(manifest.compute.default.handler, 'entry.handler');
    assert.strictEqual(
      manifest.compute.default.bundle,
      path.join(tmpDir, 'dist', 'server'),
    );
    assert.strictEqual(
      manifest.staticAssets.directory,
      path.join(tmpDir, 'dist', 'client'),
    );
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

  void it('detects middleware', () => {
    writeServerBuild(tmpDir, { middleware: true });
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.ok(manifest.middleware);
    assert.strictEqual(manifest.middleware!.handler, '_middleware.handler');
  });

  void it('omits middleware when _middleware.mjs is absent', () => {
    writeServerBuild(tmpDir, { middleware: false });
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(manifest.middleware, undefined);
  });

  void it('detects built-in image endpoint and emits image-opt config', () => {
    writeServerBuild(tmpDir, { imageEndpoint: true });
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.ok(manifest.imageOptimization);
    assert.strictEqual(manifest.imageOptimization!.baseURL, '/_astro/_image');
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
