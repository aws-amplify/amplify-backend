import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { astroAdapter } from './astro.js';
import { spawn } from './spawn.js';
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

  void it("trailingSlash: 'always' still emits both bare and subtree forms (P1.6)", () => {
    // P1.6: when `trailingSlash: 'always'`, the previous adapter
    // emitted only the slashed form (`/about/`). With CloudFront's
    // first-match-wins behavior matching, that meant `/about` (the
    // bare form) fell through to the catch-all → SSR Lambda before
    // the canonical-form redirect could fire. Now we emit BOTH
    // patterns (`/about` bare + `/about/*` subtree) so:
    //
    //   - `/about` matches the bare static behavior → 200 from S3
    //     (or, if the trailing-slash redirect is in front, 308 to
    //     `/about/` first; either way no Lambda).
    //   - `/about/` matches `/about/*` (CloudFront `*` matches zero
    //     or more chars) → 200 from S3.
    //   - `/about/img.png` matches `/about/*` → 200 from S3.
    fs.writeFileSync(
      path.join(tmpDir, 'astro.config.mjs'),
      "export default { output: 'hybrid', trailingSlash: 'always' };",
    );
    writeServerBuild(tmpDir, { prerendered: ['about'] });
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    const patterns = manifest.routes.map((r) => r.pattern);
    assert.ok(
      patterns.includes('/about'),
      'bare /about emitted regardless of trailingSlash mode',
    );
    assert.ok(
      patterns.includes('/about/*'),
      '/about/* subtree covers slashed + asset siblings',
    );
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

void describe('astroAdapter — redirects lift', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-astro-redir-'));
    writePkg(tmpDir, { dependencies: { astro: '^5.0.0' } });
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('lifts string-shorthand redirects as 301', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'astro.config.mjs'),
      "export default { redirects: { '/old': '/new', '/legacy/page': '/page' } };",
    );
    writeStaticBuild(tmpDir);
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.deepStrictEqual(manifest.redirects, [
      { source: '/old', destination: '/new', statusCode: 301 },
      { source: '/legacy/page', destination: '/page', statusCode: 301 },
    ]);
  });

  void it('lifts object-form redirects with the declared status code', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'astro.config.mjs'),
      "export default { redirects: { '/old': { destination: '/new', status: 308 } } };",
    );
    writeStaticBuild(tmpDir);
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.deepStrictEqual(manifest.redirects, [
      { source: '/old', destination: '/new', statusCode: 308 },
    ]);
  });

  void it('handles mixed string + object forms in one config', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'astro.config.mjs'),
      'export default { redirects: { ' +
        "'/a': '/aa', " +
        "'/b': { destination: '/bb', status: 302 }, " +
        "'/c': { destination: '/cc' }, " + // status omitted → defaults to 301
        "'/d': { destination: '/dd', status: 307 } " +
        '} };',
    );
    writeStaticBuild(tmpDir);
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.deepStrictEqual(manifest.redirects, [
      { source: '/a', destination: '/aa', statusCode: 301 },
      { source: '/b', destination: '/bb', statusCode: 302 },
      { source: '/c', destination: '/cc', statusCode: 301 },
      { source: '/d', destination: '/dd', statusCode: 307 },
    ]);
  });

  void it('omits manifest.redirects when astro.config has none', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'astro.config.mjs'),
      "export default { output: 'static' };",
    );
    writeStaticBuild(tmpDir);
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.strictEqual(manifest.redirects, undefined);
  });

  void it('skips malformed entries silently (typo in destination key)', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'astro.config.mjs'),
      'export default { redirects: { ' +
        "'/good': '/ok', " +
        "'/bad': { dest: '/wrong-key' } " + // wrong field name
        '} };',
    );
    writeStaticBuild(tmpDir);
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.deepStrictEqual(manifest.redirects, [
      { source: '/good', destination: '/ok', statusCode: 301 },
    ]);
  });

  void it('caps lifted redirects at 100 and emits a warning for the overflow', () => {
    const entries: string[] = [];
    for (let i = 0; i < 150; i++) {
      entries.push(`'/old-${i}': '/new-${i}'`);
    }
    fs.writeFileSync(
      path.join(tmpDir, 'astro.config.mjs'),
      `export default { redirects: { ${entries.join(', ')} } };`,
    );
    writeStaticBuild(tmpDir);
    const errs: string[] = [];
    const origWrite = process.stderr.write.bind(process.stderr) as (
      s: string | Uint8Array,
    ) => boolean;
    process.stderr.write = ((s: string | Uint8Array) => {
      errs.push(typeof s === 'string' ? s : Buffer.from(s).toString());
      return true;
    }) as typeof process.stderr.write;
    let manifest;
    try {
      manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    } finally {
      process.stderr.write = origWrite;
    }
    assert.strictEqual(manifest.redirects?.length, 100);
    assert.strictEqual(manifest.redirects?.[0].source, '/old-0');
    assert.strictEqual(manifest.redirects?.[99].source, '/old-99');
    assert.ok(
      errs.some((m) => /150 redirects/.test(m) && /100/.test(m)),
      `expected an overflow warning; stderr was: ${errs.join('')}`,
    );
  });

  void it('SSR build also receives lifted redirects', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'astro.config.mjs'),
      "export default { output: 'server', redirects: { '/old': '/new' } };",
    );
    writeServerBuild(tmpDir);
    const manifest = astroAdapter({ projectDir: tmpDir, skipBuild: true });
    assert.deepStrictEqual(manifest.redirects, [
      { source: '/old', destination: '/new', statusCode: 301 },
    ]);
  });
});

void describe('astroAdapter — @astrojs/node bridge install', () => {
  let tmpDir: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let spawnCalls: any[][];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-astro-install-'));
    writePkg(tmpDir, { dependencies: { astro: '^5.0.0' } });
    fs.writeFileSync(
      path.join(tmpDir, 'astro.config.mjs'),
      "export default { output: 'server' };",
    );
    writeServerBuild(tmpDir);
    spawnCalls = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mock.method(spawn, 'sync', ((...args: any[]) => {
      spawnCalls.push(args);
      return undefined;
    }) as never);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    mock.restoreAll();
  });

  void it('installs @astrojs/node with --save (not --no-save) so it persists across deploys', () => {
    astroAdapter({ projectDir: tmpDir });
    const installCall = spawnCalls.find(
      (c) => c[0] === 'npm' && c[1].includes('install'),
    );
    assert.ok(installCall, 'expected an `npm install` call');
    const args = installCall[1] as string[];
    assert.ok(
      args.includes('--save'),
      `expected --save in npm install args; got: ${args.join(' ')}`,
    );
    assert.ok(
      !args.includes('--no-save'),
      `expected --no-save NOT to be passed; got: ${args.join(' ')}`,
    );
    // The pin itself must still be passed for npm to know which version
    // to resolve (latest 9.x).
    assert.ok(
      args.some((a) => a.startsWith('@astrojs/node@')),
      `expected @astrojs/node pin in npm install args; got: ${args.join(' ')}`,
    );
  });

  void it('skips install when @astrojs/node is already present in node_modules', () => {
    // Synthesize the node_modules entry — userHasAstroJsNode reads via
    // local-pkg's filesystem probe.
    const pkgDir = path.join(tmpDir, 'node_modules', '@astrojs', 'node');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({
        name: '@astrojs/node',
        version: '9.0.0',
        main: 'index.js',
      }),
    );
    fs.writeFileSync(path.join(pkgDir, 'index.js'), '');

    astroAdapter({ projectDir: tmpDir });
    const installCall = spawnCalls.find(
      (c) => c[0] === 'npm' && c[1].includes('install'),
    );
    assert.strictEqual(
      installCall,
      undefined,
      'no npm install should run when @astrojs/node is already present',
    );
  });

  void it('runs the bridge when astro.config has no `adapter:` even if @astrojs/node is present in node_modules', () => {
    // Regression: previously the adapter checked whether @astrojs/node
    // was on disk to decide if the user had wired their own adapter.
    // That signal is unreliable — the package can land in node_modules
    // from a prior install or as a transitive dep without being wired
    // in astro.config — so the bridge was silently skipped and
    // `astro build` failed with [NoAdapterInstalled]. Now the bridge
    // decision keys on `config.adapter` instead, so a config like
    // `{ output: 'server' }` (no adapter wired) still gets the bridge
    // even when the package is on disk.
    //
    // Capture which `astro build` invocation runs: when the bridge
    // active, the build command runs against the bridge config dir
    // (--config <projectDir>/.amplify/astro/config-bridge.mjs); when
    // the bridge is skipped, it's the user's own astro.config and no
    // --config flag is passed.
    const pkgDir = path.join(tmpDir, 'node_modules', '@astrojs', 'node');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({
        name: '@astrojs/node',
        version: '9.0.0',
        main: 'index.js',
      }),
    );
    fs.writeFileSync(path.join(pkgDir, 'index.js'), '');

    astroAdapter({ projectDir: tmpDir });

    const buildCall = spawnCalls.find(
      (c) => Array.isArray(c[1]) && c[1].some((a: string) => a === 'build'),
    );
    assert.ok(buildCall, 'expected an astro build invocation');
    const args = buildCall[1] as string[];
    assert.ok(
      args.includes('--config') &&
        args.some((a) => a.includes('config-bridge.mjs')),
      `bridge --config flag must point to the bridge config path; got: ${args.join(' ')}` +
        '. The adapter must run the bridge when astro.config has no adapter wired, ' +
        'even when @astrojs/node is already on disk.',
    );
  });

  void it('skips the bridge when astro.config has an `adapter:` wired', () => {
    // The complementary case: when the user explicitly wires an
    // adapter in astro.config, trust them — do not inject our bridge.
    fs.writeFileSync(
      path.join(tmpDir, 'astro.config.mjs'),
      [
        "import node from '@astrojs/node';",
        'export default {',
        "  output: 'server',",
        "  adapter: node({ mode: 'standalone' }),",
        '};',
      ].join('\n'),
    );
    // The package must be present for the user-config path to import
    // without throwing.
    const pkgDir = path.join(tmpDir, 'node_modules', '@astrojs', 'node');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({
        name: '@astrojs/node',
        version: '9.0.0',
        main: 'index.js',
      }),
    );
    fs.writeFileSync(
      path.join(pkgDir, 'index.js'),
      'export default () => ({ name: "@astrojs/node", hooks: {} });',
    );

    astroAdapter({ projectDir: tmpDir });

    const buildCall = spawnCalls.find(
      (c) => Array.isArray(c[1]) && c[1].some((a: string) => a === 'build'),
    );
    assert.ok(buildCall, 'expected an astro build invocation');
    const args = buildCall[1] as string[];
    assert.ok(
      !args.includes('--config'),
      `bridge --config flag should NOT be present when user wires their own adapter; got: ${args.join(' ')}`,
    );
  });
});
