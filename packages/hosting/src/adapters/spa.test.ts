import { afterEach, beforeEach, describe, it } from 'node:test';
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
    const manifest = spaAdapter(tmpDir);

    assert.strictEqual(manifest.version, 1);
    assert.strictEqual(manifest.routes.length, 1);
    assert.strictEqual(manifest.routes[0].pattern, '/*');
    assert.strictEqual(manifest.routes[0].target, 'static');
    assert.deepStrictEqual(manifest.compute, {});
  });

  void it('copies files to .amplify-hosting/static/', () => {
    spaAdapter(tmpDir);

    const staticDir = path.join(tmpDir, '.amplify-hosting', 'static');
    assert.ok(fs.existsSync(path.join(staticDir, 'index.html')));
    assert.ok(fs.existsSync(path.join(staticDir, 'main.js')));
    assert.ok(fs.existsSync(path.join(staticDir, 'assets', 'style.css')));
  });

  void it('writes deploy-manifest.json to .amplify-hosting/', () => {
    spaAdapter(tmpDir);

    const manifestPath = path.join(
      tmpDir,
      '.amplify-hosting',
      'deploy-manifest.json',
    );
    assert.ok(fs.existsSync(manifestPath));

    const written = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.strictEqual(written.version, 1);
    assert.strictEqual(written.routes[0].pattern, '/*');
    assert.strictEqual(written.routes[0].target, 'static');
  });

  void it('cleans previous hosting output before copying', () => {
    spaAdapter(tmpDir);

    // Add a file that shouldn't survive
    const staleFile = path.join(
      tmpDir,
      '.amplify-hosting',
      'static',
      'stale.txt',
    );
    fs.writeFileSync(staleFile, 'stale');

    spaAdapter(tmpDir);
    assert.ok(
      !fs.existsSync(staleFile),
      'Stale files should be cleaned on re-run',
    );
  });

  void it('throws when build output directory does not exist', () => {
    const emptyProject = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-spa-empty-'),
    );
    assert.throws(
      () => spaAdapter(emptyProject),
      (error: Error) => {
        assert.ok(error.name === 'BuildOutputNotFoundError');
        return true;
      },
    );
    fs.rmSync(emptyProject, { recursive: true, force: true });
  });

  void it('excludes source map files by default', () => {
    fs.writeFileSync(path.join(buildDir, 'main.js.map'), '{"sourcemap":true}');
    fs.writeFileSync(path.join(buildDir, 'assets', 'style.css.map'), '{}');

    spaAdapter(tmpDir);

    const staticDir = path.join(tmpDir, '.amplify-hosting', 'static');
    assert.ok(
      !fs.existsSync(path.join(staticDir, 'main.js.map')),
      'Source maps should be excluded from static output',
    );
    assert.ok(
      !fs.existsSync(path.join(staticDir, 'assets', 'style.css.map')),
      'Nested source maps should be excluded',
    );
    assert.ok(
      fs.existsSync(path.join(staticDir, 'main.js')),
      'Non-map files should be copied',
    );
  });

  void it('excludes .DS_Store and thumbs.db', () => {
    fs.writeFileSync(path.join(buildDir, '.DS_Store'), '');
    fs.writeFileSync(path.join(buildDir, 'thumbs.db'), '');

    spaAdapter(tmpDir);

    const staticDir = path.join(tmpDir, '.amplify-hosting', 'static');
    assert.ok(
      !fs.existsSync(path.join(staticDir, '.DS_Store')),
      '.DS_Store should be excluded',
    );
    assert.ok(
      !fs.existsSync(path.join(staticDir, 'thumbs.db')),
      'thumbs.db should be excluded',
    );
  });

  void it('throws BuildOutputEmptyError for empty build directory', () => {
    const emptyProject = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-spa-emptybuild-'),
    );
    const emptyDist = path.join(emptyProject, 'dist');
    fs.mkdirSync(emptyDist, { recursive: true });

    assert.throws(
      () => spaAdapter(emptyProject),
      (error: Error) => {
        assert.strictEqual(error.name, 'BuildOutputEmptyError');
        return true;
      },
    );
    fs.rmSync(emptyProject, { recursive: true, force: true });
  });

  void it('throws MissingIndexHtmlError when no index.html is found', () => {
    fs.unlinkSync(path.join(buildDir, 'index.html'));

    assert.throws(
      () => spaAdapter(tmpDir),
      (error: Error) => {
        assert.strictEqual(error.name, 'MissingIndexHtmlError');
        return true;
      },
    );
  });
});
