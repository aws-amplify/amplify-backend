import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { buildAndPrepare } from './index.js';

void describe('buildAndPrepare', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-build-pipeline-test-'),
    );
    // Create a package.json so framework detection works
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test-app', dependencies: { react: '^18.0.0' } }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('skips build when .amplify-hosting/ already exists (CI/CD mode)', () => {
    // Create pre-existing .amplify-hosting/ with valid manifest
    const hostingDir = path.join(tmpDir, '.amplify-hosting');
    fs.mkdirSync(path.join(hostingDir, 'static'), { recursive: true });
    fs.writeFileSync(
      path.join(hostingDir, 'deploy-manifest.json'),
      JSON.stringify({
        version: 1,
        routes: [{ path: '/*', target: { kind: 'Static' } }],
        framework: { name: 'spa' },
      }),
    );

    const result = buildAndPrepare({
      projectDir: tmpDir,
      framework: 'spa',
    });

    assert.strictEqual(result.buildSkipped, true);
    assert.strictEqual(result.manifest.version, 1);
    assert.strictEqual(result.manifest.framework.name, 'spa');
  });

  void it('runs build command and adapter when no pre-built output exists', () => {
    // Create a dist/ directory that the "build" command will create
    const distDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'index.html'), '<html>hello</html>');

    const result = buildAndPrepare({
      projectDir: tmpDir,
      framework: 'spa',
      buildOutputDir: 'dist',
      // No buildCommand — skip actual build, just run adapter
    });

    assert.strictEqual(result.buildSkipped, false);
    assert.strictEqual(result.manifest.version, 1);
    assert.strictEqual(result.manifest.framework.name, 'spa');
    assert.ok(
      fs.existsSync(
        path.join(tmpDir, '.amplify-hosting', 'deploy-manifest.json'),
      ),
    );
  });

  void it('executes build command before running adapter', () => {
    // Build command creates the dist/ directory
    const result = buildAndPrepare({
      projectDir: tmpDir,
      framework: 'spa',
      buildCommand: 'mkdir -p dist && echo "<html>built</html>" > dist/index.html',
      buildOutputDir: 'dist',
    });

    assert.strictEqual(result.buildSkipped, false);
    assert.strictEqual(result.manifest.version, 1);
    // Verify the build output was produced
    assert.ok(
      fs.existsSync(path.join(tmpDir, 'dist', 'index.html')),
      'Build command should have created dist/index.html',
    );
    // Verify adapter ran and produced .amplify-hosting/
    assert.ok(
      fs.existsSync(
        path.join(tmpDir, '.amplify-hosting', 'static', 'index.html'),
      ),
      'Adapter should have copied to .amplify-hosting/static/',
    );
  });

  void it('throws BuildOutputNotFoundError when build output dir missing', () => {
    // No dist/ directory and no build command
    assert.throws(
      () =>
        buildAndPrepare({
          projectDir: tmpDir,
          framework: 'spa',
          buildOutputDir: 'dist',
        }),
      (error: Error) => {
        assert.strictEqual(error.name, 'BuildOutputNotFoundError');
        assert.ok(error.message.includes('Build output directory not found'));
        return true;
      },
    );
  });

  void it('throws BuildError when build command fails', () => {
    assert.throws(
      () =>
        buildAndPrepare({
          projectDir: tmpDir,
          framework: 'spa',
          buildCommand: 'exit 1',
          buildOutputDir: 'dist',
        }),
      (error: Error) => {
        assert.strictEqual(error.name, 'BuildError');
        return true;
      },
    );
  });

  void it('auto-detects framework from package.json', () => {
    // Create dist/ for spa detection
    const distDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'index.html'), '<html></html>');

    const result = buildAndPrepare({
      projectDir: tmpDir,
      buildOutputDir: 'dist',
      // framework not specified — should auto-detect 'spa'
    });

    assert.strictEqual(result.manifest.framework.name, 'spa');
  });

  void it('uses default build output dir per framework', () => {
    // SPA default is 'dist'
    const distDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'index.html'), '<html></html>');

    const result = buildAndPrepare({
      projectDir: tmpDir,
      framework: 'spa',
      // No buildOutputDir — should default to 'dist'
    });

    assert.strictEqual(result.buildSkipped, false);
    assert.ok(result.manifest);
  });

  void it('CI/CD mode ignores buildCommand when manifest exists', () => {
    // Create pre-existing .amplify-hosting/
    const hostingDir = path.join(tmpDir, '.amplify-hosting');
    fs.mkdirSync(path.join(hostingDir, 'static'), { recursive: true });
    fs.writeFileSync(
      path.join(hostingDir, 'deploy-manifest.json'),
      JSON.stringify({
        version: 1,
        routes: [{ path: '/*', target: { kind: 'Static' } }],
        framework: { name: 'spa' },
      }),
    );

    // Even with a buildCommand that would fail, CI/CD mode skips it
    const result = buildAndPrepare({
      projectDir: tmpDir,
      framework: 'spa',
      buildCommand: 'exit 1',
    });

    assert.strictEqual(result.buildSkipped, true);
    assert.ok(result.manifest);
  });
});
