import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getHostingOutputDir, parseManifest } from './parser.js';

void describe('parseManifest', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-parser-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('parses a valid manifest', () => {
    const manifest = {
      version: 1,
      routes: [
        {
          path: '/*',
          target: {
            kind: 'Static',
          },
        },
      ],
      framework: { name: 'spa', version: '1.0.0' },
    };

    fs.writeFileSync(
      path.join(tmpDir, 'deploy-manifest.json'),
      JSON.stringify(manifest),
    );

    const result = parseManifest(tmpDir);
    assert.strictEqual(result.version, 1);
    assert.strictEqual(result.routes.length, 1);
    assert.strictEqual(result.routes[0].path, '/*');
    assert.strictEqual(result.framework.name, 'spa');
  });

  void it('throws ManifestNotFoundError when file missing', () => {
    assert.throws(
      () => parseManifest(tmpDir),
      (error: Error) => {
        assert.ok(error.name === 'ManifestNotFoundError');
        return true;
      },
    );
  });

  void it('throws ManifestParseError for invalid JSON', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'deploy-manifest.json'),
      'not valid json {{{',
    );

    assert.throws(
      () => parseManifest(tmpDir),
      (error: Error) => {
        assert.ok(error.name === 'ManifestParseError');
        return true;
      },
    );
  });

  void it('throws ManifestReadError when file is not readable', () => {
    const manifestPath = path.join(tmpDir, 'deploy-manifest.json');
    fs.writeFileSync(manifestPath, '{}');
    // Remove read permission so readFileSync fails
    fs.chmodSync(manifestPath, 0o000);

    assert.throws(
      () => parseManifest(tmpDir),
      (error: Error) => {
        assert.ok(
          error.name === 'ManifestReadError',
          `Expected ManifestReadError, got ${error.name}`,
        );
        assert.ok(error.cause, 'ManifestReadError should have a cause');
        return true;
      },
    );

    // Restore permissions for cleanup
    fs.chmodSync(manifestPath, 0o644);
  });

  void it('throws ManifestValidationError for invalid schema', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'deploy-manifest.json'),
      JSON.stringify({ version: 99, routes: [], framework: { name: '' } }),
    );

    assert.throws(
      () => parseManifest(tmpDir),
      (error: Error) => {
        assert.ok(error.name === 'ManifestValidationError');
        return true;
      },
    );
  });
});

void describe('getHostingOutputDir', () => {
  void it('returns .amplify-hosting path', () => {
    const testDir = path.join(path.sep, 'my', 'project');
    const result = getHostingOutputDir(testDir);
    assert.strictEqual(result, path.join(testDir, '.amplify-hosting'));
  });
});
