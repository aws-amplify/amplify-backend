import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spaAdapter } from './spa.js';

void describe('spaAdapter', () => {
  let tmpDir: string;
  let buildDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-spa-test-'));
    buildDir = path.join(tmpDir, 'dist');

    // Create a mock build output
    fs.mkdirSync(buildDir, { recursive: true });
    fs.writeFileSync(path.join(buildDir, 'index.html'), '<html></html>');
    fs.writeFileSync(path.join(buildDir, 'main.js'), 'console.log("app")');
    fs.mkdirSync(path.join(buildDir, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(buildDir, 'assets', 'style.css'), 'body{}');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('produces correct manifest with catch-all static route', () => {
    const manifest = spaAdapter(buildDir, tmpDir);

    assert.strictEqual(manifest.version, 1);
    assert.strictEqual(manifest.routes.length, 1);
    assert.strictEqual(manifest.routes[0].path, '/*');
    assert.strictEqual(manifest.routes[0].target.kind, 'Static');
    assert.strictEqual(manifest.framework.name, 'spa');
    assert.strictEqual(manifest.computeResources, undefined);
  });

  void it('copies files to .amplify-hosting/static/', () => {
    spaAdapter(buildDir, tmpDir);

    const staticDir = path.join(tmpDir, '.amplify-hosting', 'static');
    assert.ok(fs.existsSync(path.join(staticDir, 'index.html')));
    assert.ok(fs.existsSync(path.join(staticDir, 'main.js')));
    assert.ok(fs.existsSync(path.join(staticDir, 'assets', 'style.css')));
  });

  void it('writes deploy-manifest.json to .amplify-hosting/', () => {
    spaAdapter(buildDir, tmpDir);

    const manifestPath = path.join(
      tmpDir,
      '.amplify-hosting',
      'deploy-manifest.json',
    );
    assert.ok(fs.existsSync(manifestPath));

    const written = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.strictEqual(written.version, 1);
    assert.strictEqual(written.routes[0].path, '/*');
  });

  void it('cleans previous hosting output before copying', () => {
    // Run adapter twice — second run should overwrite
    spaAdapter(buildDir, tmpDir);

    // Add a file that shouldn't survive
    const staleFile = path.join(
      tmpDir,
      '.amplify-hosting',
      'static',
      'stale.txt',
    );
    fs.writeFileSync(staleFile, 'stale');

    spaAdapter(buildDir, tmpDir);
    assert.ok(
      !fs.existsSync(staleFile),
      'Stale files should be cleaned on re-run',
    );
  });

  void it('throws when build output directory does not exist', () => {
    assert.throws(
      () => spaAdapter('/nonexistent/path', tmpDir),
      (error: Error) => {
        assert.ok(error.name === 'BuildOutputNotFoundError');
        return true;
      },
    );
  });
});
