import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { nextjsAdapter, generateRunScript } from './nextjs.js';

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
    fs.writeFileSync(
      path.join(staticDir, 'chunks', 'main-abc123.js'),
      'chunk',
    );
    fs.writeFileSync(
      path.join(staticDir, 'buildManifest.json'),
      '{}',
    );
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
    assert.ok(staticRoute!.target.cacheControl?.includes('immutable'));

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
    assert.ok(
      fs.existsSync(path.join(staticDir, 'chunks', 'main-abc123.js')),
    );
    assert.ok(fs.existsSync(path.join(staticDir, 'buildManifest.json')));
  });

  void it('dual-copies static assets to compute for fallback', () => {
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
      fs.existsSync(path.join(computeStaticDir, 'chunks', 'main-abc123.js')),
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
      !fs.existsSync(
        path.join(tmpDir, '.amplify-hosting', 'stale.txt'),
      ),
    );
  });
});

void describe('generateRunScript', () => {
  void it('generates a bash script with correct content', () => {
    const script = generateRunScript();
    assert.ok(script.startsWith('#!/bin/bash'));
    assert.ok(script.includes('PORT=3000'));
    assert.ok(script.includes('HOSTNAME=0.0.0.0'));
    assert.ok(script.includes('NODE_ENV=production'));
    assert.ok(script.includes('exec node server.js'));
  });
});
