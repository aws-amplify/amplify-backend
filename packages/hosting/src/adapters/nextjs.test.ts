import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  checkNextConfig,
  generateRunScript,
  nextjsAdapter,
  scanPublicRoutes,
} from './nextjs.js';

void describe('nextjsAdapter', () => {
  let tmpDir: string;
  let nextDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-nextjs-test-'));
    nextDir = path.join(tmpDir, '.next');

    // Create mock .next/standalone/ with server.js
    const standaloneDir = path.join(nextDir, 'standalone');
    fs.mkdirSync(standaloneDir, { recursive: true });
    fs.writeFileSync(
      path.join(standaloneDir, 'server.js'),
      'const http = require("http"); http.createServer().listen(3000);',
    );
    fs.writeFileSync(
      path.join(standaloneDir, 'package.json'),
      '{"name":"standalone"}',
    );

    // Create mock .next/static/ with hashed assets
    const staticDir = path.join(nextDir, 'static');
    fs.mkdirSync(path.join(staticDir, 'chunks'), { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'chunks', 'main-abc123.js'), 'chunk');
    fs.writeFileSync(path.join(staticDir, 'buildManifest.json'), '{}');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('produces manifest with static and compute routes', () => {
    const manifest = nextjsAdapter(nextDir, tmpDir);

    assert.strictEqual(manifest.version, 1);
    assert.strictEqual(manifest.framework.name, 'nextjs');

    // Should have /_next/static/* static route and /* compute route
    const staticRoute = manifest.routes.find(
      (r) => r.path === '/_next/static/*',
    );
    assert.ok(staticRoute, 'Should have /_next/static/* route');
    assert.strictEqual(staticRoute!.target.kind, 'Static');

    const catchAllRoute = manifest.routes.find((r) => r.path === '/*');
    assert.ok(catchAllRoute, 'Should have /* catch-all route');
    assert.strictEqual(catchAllRoute!.target.kind, 'Compute');
    assert.strictEqual(catchAllRoute!.target.src, 'default');
  });

  void it('includes compute resource with run.sh entrypoint', () => {
    const manifest = nextjsAdapter(nextDir, tmpDir);

    assert.ok(manifest.computeResources);
    assert.strictEqual(manifest.computeResources!.length, 1);
    assert.strictEqual(manifest.computeResources![0].name, 'default');
    assert.strictEqual(manifest.computeResources![0].runtime, 'nodejs20.x');
    assert.strictEqual(manifest.computeResources![0].entrypoint, 'run.sh');
  });

  void it('copies standalone to compute/default/', () => {
    nextjsAdapter(nextDir, tmpDir);

    const computeDir = path.join(
      tmpDir,
      '.amplify-hosting',
      'compute',
      'default',
    );
    assert.ok(fs.existsSync(path.join(computeDir, 'server.js')));
    assert.ok(fs.existsSync(path.join(computeDir, 'package.json')));
  });

  void it('copies static assets to static/_next/static/', () => {
    nextjsAdapter(nextDir, tmpDir);

    const staticDir = path.join(
      tmpDir,
      '.amplify-hosting',
      'static',
      '_next',
      'static',
    );
    assert.ok(fs.existsSync(path.join(staticDir, 'chunks', 'main-abc123.js')));
    assert.ok(fs.existsSync(path.join(staticDir, 'buildManifest.json')));
  });

  void it('does NOT copy static assets to compute (served from S3 via CloudFront)', () => {
    nextjsAdapter(nextDir, tmpDir);

    const computeStaticDir = path.join(
      tmpDir,
      '.amplify-hosting',
      'compute',
      'default',
      '.next',
      'static',
    );
    assert.ok(
      !fs.existsSync(computeStaticDir),
      'Static assets should not be in compute package — CloudFront serves them from S3',
    );
  });

  void it('generates run.sh bootstrap script', () => {
    nextjsAdapter(nextDir, tmpDir);

    const runShPath = path.join(
      tmpDir,
      '.amplify-hosting',
      'compute',
      'default',
      'run.sh',
    );
    assert.ok(fs.existsSync(runShPath));
    const content = fs.readFileSync(runShPath, 'utf-8');
    assert.ok(content.includes('exec node server.js'));
    assert.ok(content.includes('PORT=3000'));
    assert.ok(content.includes('HOSTNAME=0.0.0.0'));
    assert.ok(content.includes('set -euo pipefail'));
  });

  void it('writes fallback index.js handler with diagnostic message', () => {
    nextjsAdapter(nextDir, tmpDir);

    const indexJsPath = path.join(
      tmpDir,
      '.amplify-hosting',
      'compute',
      'default',
      'index.js',
    );
    assert.ok(fs.existsSync(indexJsPath));
    const content = fs.readFileSync(indexJsPath, 'utf-8');
    assert.ok(content.includes('exports.handler'));
    assert.ok(content.includes('502'));
    assert.ok(content.includes('Lambda Web Adapter'));
  });

  void it('copies public/ directory to static/ and compute/', () => {
    // Create public/ directory
    const publicDir = path.join(tmpDir, 'public');
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), 'icon');
    fs.writeFileSync(path.join(publicDir, 'robots.txt'), 'User-agent: *');

    nextjsAdapter(nextDir, tmpDir);

    // Verify copied to static/
    assert.ok(
      fs.existsSync(
        path.join(tmpDir, '.amplify-hosting', 'static', 'favicon.ico'),
      ),
    );
    assert.ok(
      fs.existsSync(
        path.join(tmpDir, '.amplify-hosting', 'static', 'robots.txt'),
      ),
    );

    // Verify copied to compute/default/public/
    assert.ok(
      fs.existsSync(
        path.join(
          tmpDir,
          '.amplify-hosting',
          'compute',
          'default',
          'public',
          'favicon.ico',
        ),
      ),
    );
  });

  void it('emits public asset routes in manifest between /_next/static/* and /*', () => {
    // Create public/ with files and directories
    const publicDir = path.join(tmpDir, 'public');
    fs.mkdirSync(path.join(publicDir, 'images'), { recursive: true });
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), 'icon');
    fs.writeFileSync(path.join(publicDir, 'images', 'logo.svg'), '<svg></svg>');

    const manifest = nextjsAdapter(nextDir, tmpDir);

    // Find route indices
    const staticIdx = manifest.routes.findIndex(
      (r) => r.path === '/_next/static/*',
    );
    const catchAllIdx = manifest.routes.findIndex((r) => r.path === '/*');
    const faviconIdx = manifest.routes.findIndex(
      (r) => r.path === '/favicon.ico',
    );
    const imagesIdx = manifest.routes.findIndex((r) => r.path === '/images/*');

    // Public routes must exist
    assert.ok(faviconIdx >= 0, 'Should have /favicon.ico route');
    assert.ok(imagesIdx >= 0, 'Should have /images/* route');

    // Order: /_next/static/* < public routes < /*
    assert.ok(
      staticIdx < faviconIdx,
      '/_next/static/* should come before /favicon.ico',
    );
    assert.ok(
      faviconIdx < catchAllIdx,
      '/favicon.ico should come before /* catch-all',
    );
    assert.ok(
      imagesIdx < catchAllIdx,
      '/images/* should come before /* catch-all',
    );

    // Verify they are Static routes
    const faviconRoute = manifest.routes[faviconIdx];
    assert.strictEqual(faviconRoute.target.kind, 'Static');

    const imagesRoute = manifest.routes[imagesIdx];
    assert.strictEqual(imagesRoute.target.kind, 'Static');
  });

  void it('writes deploy-manifest.json', () => {
    nextjsAdapter(nextDir, tmpDir);

    const manifestPath = path.join(
      tmpDir,
      '.amplify-hosting',
      'deploy-manifest.json',
    );
    assert.ok(fs.existsSync(manifestPath));
    const written = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.strictEqual(written.version, 1);
    assert.strictEqual(written.framework.name, 'nextjs');
    assert.ok(written.computeResources);
  });

  void it('throws when standalone directory is missing', () => {
    // Remove the standalone dir
    fs.rmSync(path.join(nextDir, 'standalone'), {
      recursive: true,
      force: true,
    });

    assert.throws(
      () => nextjsAdapter(nextDir, tmpDir),
      (error: Error) => {
        assert.ok(error.name === 'NextjsStandaloneNotFoundError');
        return true;
      },
    );
  });

  void it('throws when server.js is missing from standalone', () => {
    fs.unlinkSync(path.join(nextDir, 'standalone', 'server.js'));

    assert.throws(
      () => nextjsAdapter(nextDir, tmpDir),
      (error: Error) => {
        assert.ok(error.name === 'NextjsServerNotFoundError');
        return true;
      },
    );
  });

  void it('cleans previous hosting output', () => {
    // First run
    nextjsAdapter(nextDir, tmpDir);

    // Add a stale file
    fs.writeFileSync(
      path.join(tmpDir, '.amplify-hosting', 'stale.txt'),
      'stale',
    );

    // Second run should clean
    nextjsAdapter(nextDir, tmpDir);
    assert.ok(
      !fs.existsSync(path.join(tmpDir, '.amplify-hosting', 'stale.txt')),
    );
  });

  void it('skips symlinks in copyDirRecursive', () => {
    // Create a symlink inside standalone dir
    const standaloneDir = path.join(nextDir, 'standalone');
    const targetFile = path.join(tmpDir, 'secret.txt');
    fs.writeFileSync(targetFile, 'secret-data');
    fs.symlinkSync(targetFile, path.join(standaloneDir, 'symlink.txt'));

    nextjsAdapter(nextDir, tmpDir);

    // Symlink should NOT be copied
    const computeDir = path.join(
      tmpDir,
      '.amplify-hosting',
      'compute',
      'default',
    );
    assert.ok(
      !fs.existsSync(path.join(computeDir, 'symlink.txt')),
      'Symlinks should not be copied',
    );
  });
});

void describe('nextjsAdapter — monorepo layout', () => {
  let tmpDir: string;
  let nextDir: string;
  const monorepoRelPath = path.join('my-monorepo', 'apps', 'web');

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-nextjs-monorepo-test-'),
    );
    nextDir = path.join(tmpDir, '.next');

    // Simulate monorepo standalone layout:
    // .next/standalone/my-monorepo/apps/web/server.js
    const nestedDir = path.join(nextDir, 'standalone', monorepoRelPath);
    fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(
      path.join(nestedDir, 'server.js'),
      'const http = require("http"); http.createServer().listen(3000);',
    );
    fs.writeFileSync(path.join(nestedDir, 'package.json'), '{"name":"web"}');

    // Create .next/static/ (same structure regardless of monorepo)
    const staticDir = path.join(nextDir, 'static');
    fs.mkdirSync(path.join(staticDir, 'chunks'), { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'chunks', 'main-abc123.js'), 'chunk');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('detects nested server.js and produces valid manifest', () => {
    const manifest = nextjsAdapter(nextDir, tmpDir);

    assert.strictEqual(manifest.version, 1);
    assert.strictEqual(manifest.framework.name, 'nextjs');

    const catchAllRoute = manifest.routes.find((r) => r.path === '/*');
    assert.ok(catchAllRoute, 'Should have /* catch-all route');
    assert.strictEqual(catchAllRoute!.target.kind, 'Compute');
  });

  void it('copies full standalone output to compute/default/', () => {
    nextjsAdapter(nextDir, tmpDir);

    const computeDir = path.join(
      tmpDir,
      '.amplify-hosting',
      'compute',
      'default',
    );
    // server.js should be at the nested path inside compute
    assert.ok(
      fs.existsSync(path.join(computeDir, monorepoRelPath, 'server.js')),
      'server.js should exist at nested monorepo path in compute',
    );
    assert.ok(
      fs.existsSync(path.join(computeDir, monorepoRelPath, 'package.json')),
    );
  });

  void it('generates run.sh with cd to nested server directory', () => {
    nextjsAdapter(nextDir, tmpDir);

    const runShPath = path.join(
      tmpDir,
      '.amplify-hosting',
      'compute',
      'default',
      'run.sh',
    );
    const content = fs.readFileSync(runShPath, 'utf-8');
    assert.ok(
      content.includes(`cd "${monorepoRelPath}" || exit 1`),
      `run.sh should cd to "${monorepoRelPath}" with || exit 1`,
    );
    assert.ok(content.includes('exec node server.js'));
  });

  void it('copies public/ relative to nested server.js location', () => {
    const publicDir = path.join(tmpDir, 'public');
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), 'icon');

    nextjsAdapter(nextDir, tmpDir);

    // public/ should be at compute/default/<monorepoRelPath>/public/
    const computePublicDir = path.join(
      tmpDir,
      '.amplify-hosting',
      'compute',
      'default',
      monorepoRelPath,
      'public',
    );
    assert.ok(
      fs.existsSync(path.join(computePublicDir, 'favicon.ico')),
      'public/favicon.ico should be relative to nested server.js',
    );

    // Static hosting output should still have it at root
    assert.ok(
      fs.existsSync(
        path.join(tmpDir, '.amplify-hosting', 'static', 'favicon.ico'),
      ),
    );
  });

  void it('still throws when server.js not found anywhere', () => {
    // Remove the nested server.js
    fs.unlinkSync(
      path.join(nextDir, 'standalone', monorepoRelPath, 'server.js'),
    );

    assert.throws(
      () => nextjsAdapter(nextDir, tmpDir),
      (error: Error) => {
        assert.ok(error.name === 'NextjsServerNotFoundError');
        return true;
      },
    );
  });
});

void describe('nextjsAdapter — .nft.json exclusion', () => {
  let tmpDir: string;
  let nextDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-nextjs-nft-test-'));
    nextDir = path.join(tmpDir, '.next');

    const standaloneDir = path.join(nextDir, 'standalone');
    fs.mkdirSync(standaloneDir, { recursive: true });
    fs.writeFileSync(
      path.join(standaloneDir, 'server.js'),
      'const http = require("http"); http.createServer().listen(3000);',
    );
    fs.writeFileSync(
      path.join(standaloneDir, 'package.json'),
      '{"name":"standalone"}',
    );

    // Create .nft.json trace files (Next.js build artifacts)
    const serverAppDir = path.join(
      standaloneDir,
      '.next',
      'server',
      'app',
      '_not-found',
    );
    fs.mkdirSync(serverAppDir, { recursive: true });
    fs.writeFileSync(
      path.join(serverAppDir, 'page.js.nft.json'),
      '{"files":[]}',
    );
    fs.writeFileSync(
      path.join(standaloneDir, '.next', 'server', 'middleware.js.nft.json'),
      '{"files":[]}',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('excludes .nft.json trace files from compute output', () => {
    nextjsAdapter(nextDir, tmpDir);

    const computeDir = path.join(
      tmpDir,
      '.amplify-hosting',
      'compute',
      'default',
    );

    // .nft.json files should NOT be in the compute package
    assert.ok(
      !fs.existsSync(
        path.join(
          computeDir,
          '.next',
          'server',
          'app',
          '_not-found',
          'page.js.nft.json',
        ),
      ),
      '.nft.json files should be excluded from compute output',
    );
    assert.ok(
      !fs.existsSync(
        path.join(computeDir, '.next', 'server', 'middleware.js.nft.json'),
      ),
      '.nft.json files should be excluded from compute output',
    );

    // But server.js and other files should still be there
    assert.ok(fs.existsSync(path.join(computeDir, 'server.js')));
    assert.ok(fs.existsSync(path.join(computeDir, 'package.json')));
  });
});

void describe('generateRunScript', () => {
  void it('generates a bash script with correct content', () => {
    const script = generateRunScript();
    assert.ok(script.startsWith('#!/bin/bash'));
    assert.ok(script.includes('set -euo pipefail'));
    assert.ok(script.includes('PORT=3000'));
    assert.ok(script.includes('HOSTNAME=0.0.0.0'));
    assert.ok(script.includes('NODE_ENV=production'));
    assert.ok(script.includes('exec node server.js'));
  });

  void it('does not include cd when serverDir is default', () => {
    const script = generateRunScript();
    assert.ok(!script.includes('\ncd '), 'Should not have cd for root server');
  });

  void it('includes cd command for nested serverDir', () => {
    const script = generateRunScript('my-monorepo/apps/web');
    assert.ok(
      script.includes('cd "my-monorepo/apps/web" || exit 1'),
      'Should cd to nested directory with || exit 1',
    );
    assert.ok(script.includes('exec node server.js'));
  });
});

void describe('checkNextConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-nextcfg-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('does not throw when config has standalone', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'next.config.js'),
      'module.exports = { output: "standalone" };',
    );
    assert.doesNotThrow(() => checkNextConfig(tmpDir));
  });

  void it('warns but does not throw when config lacks standalone', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'next.config.js'),
      'module.exports = { reactStrictMode: true };',
    );
    const stderrWrites: string[] = [];
    const originalWrite = process.stderr.write.bind(process.stderr);
    mock.method(
      process.stderr,
      'write',
      (chunk: string | Uint8Array, ...args: unknown[]) => {
        if (typeof chunk === 'string') {
          stderrWrites.push(chunk);
        }
        return originalWrite(chunk, ...(args as []));
      },
    );
    // Should not throw — only warn
    assert.doesNotThrow(() => checkNextConfig(tmpDir));
    const warningMsg = stderrWrites.find((msg) =>
      msg.includes('may not have output'),
    );
    assert.ok(warningMsg, 'Expected a warning about standalone config');
    mock.restoreAll();
  });

  void it('throws NextjsConfigNotFoundError when no config exists', () => {
    assert.throws(
      () => checkNextConfig(tmpDir),
      (error: Error) => {
        assert.strictEqual(error.name, 'NextjsConfigNotFoundError');
        return true;
      },
    );
  });

  void it('checks next.config.mjs', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'next.config.mjs'),
      'export default { output: "standalone" };',
    );
    assert.doesNotThrow(() => checkNextConfig(tmpDir));
  });
});

void describe('scanPublicRoutes', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-public-routes-test-'),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('returns routes for files and directories in public/', () => {
    const publicDir = path.join(tmpDir, 'public');
    fs.mkdirSync(path.join(publicDir, 'images'), { recursive: true });
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), 'icon');
    fs.writeFileSync(path.join(publicDir, 'robots.txt'), 'robots');
    fs.writeFileSync(path.join(publicDir, 'images', 'logo.svg'), '<svg></svg>');

    const routes = scanPublicRoutes(tmpDir);

    // Should have routes for favicon.ico, robots.txt (files) and images (dir)
    assert.strictEqual(routes.length, 3);

    const faviconRoute = routes.find((r) => r.path === '/favicon.ico');
    assert.ok(faviconRoute, 'Should have /favicon.ico route');
    assert.strictEqual(faviconRoute!.target.kind, 'Static');

    const robotsRoute = routes.find((r) => r.path === '/robots.txt');
    assert.ok(robotsRoute, 'Should have /robots.txt route');
    assert.strictEqual(robotsRoute!.target.kind, 'Static');

    const imagesRoute = routes.find((r) => r.path === '/images/*');
    assert.ok(imagesRoute, 'Should have /images/* route');
    assert.strictEqual(imagesRoute!.target.kind, 'Static');
  });

  void it('returns empty array when public/ does not exist', () => {
    const routes = scanPublicRoutes(tmpDir);
    assert.deepStrictEqual(routes, []);
  });

  void it('filters out dotfiles', () => {
    const publicDir = path.join(tmpDir, 'public');
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(path.join(publicDir, '.DS_Store'), '');
    fs.writeFileSync(path.join(publicDir, '.gitkeep'), '');
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), 'icon');

    const routes = scanPublicRoutes(tmpDir);

    // Only favicon.ico should be included — dotfiles filtered out
    assert.strictEqual(routes.length, 1);
    assert.strictEqual(routes[0].path, '/favicon.ico');
  });

  void it('ignores symlinks in public/', () => {
    const publicDir = path.join(tmpDir, 'public');
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(path.join(publicDir, 'real.txt'), 'real');

    const targetFile = path.join(tmpDir, 'outside.txt');
    fs.writeFileSync(targetFile, 'outside');
    fs.symlinkSync(targetFile, path.join(publicDir, 'symlink.txt'));

    const routes = scanPublicRoutes(tmpDir);

    // Only real.txt — symlinks are ignored
    assert.strictEqual(routes.length, 1);
    assert.strictEqual(routes[0].path, '/real.txt');
  });

  void it('returns empty array for empty public/ directory', () => {
    const publicDir = path.join(tmpDir, 'public');
    fs.mkdirSync(publicDir, { recursive: true });

    const routes = scanPublicRoutes(tmpDir);
    assert.deepStrictEqual(routes, []);
  });
});
