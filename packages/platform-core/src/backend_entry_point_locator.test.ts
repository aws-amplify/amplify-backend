import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BackendLocator } from './backend_entry_point_locator.js';

void describe('BackendLocator', () => {
  let tmpDir: string;

  const makeTmpDir = (): string => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'locator-test-'));
    return tmpDir;
  };

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  void describe('locate', () => {
    void it('finds amplify/backend.ts by default', () => {
      const root = makeTmpDir();
      const dir = path.join(root, 'amplify');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'backend.ts'), '// backend');

      const locator = new BackendLocator(root);
      assert.strictEqual(
        locator.locate(),
        path.join('amplify', 'backend') + '.ts',
      );
    });

    void it('prefers .js over .ts when both exist', () => {
      const root = makeTmpDir();
      const dir = path.join(root, 'amplify');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'backend.ts'), '// ts');
      fs.writeFileSync(path.join(dir, 'backend.js'), '// js');

      const locator = new BackendLocator(root);
      assert.strictEqual(
        locator.locate(),
        path.join('amplify', 'backend') + '.js',
      );
    });

    void it('throws FileConventionError when no file exists', () => {
      const root = makeTmpDir();
      const locator = new BackendLocator(root);
      assert.throws(
        () => locator.locate(),
        (err: Error) => {
          assert.strictEqual(err.name, 'FileConventionError');
          return true;
        },
      );
    });

    void it('uses custom basePath for hosting', () => {
      const root = makeTmpDir();
      const dir = path.join(root, 'amplify');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'hosting.ts'), '// hosting');

      const locator = new BackendLocator(root, path.join('amplify', 'hosting'));
      assert.strictEqual(
        locator.locate(),
        path.join('amplify', 'hosting') + '.ts',
      );
    });

    void it('throws for hosting path when file does not exist', () => {
      const root = makeTmpDir();
      const locator = new BackendLocator(root, path.join('amplify', 'hosting'));
      assert.throws(
        () => locator.locate(),
        (err: Error) => {
          assert.strictEqual(err.name, 'FileConventionError');
          assert.match(err.message, /amplify.hosting/);
          return true;
        },
      );
    });
  });

  void describe('exists', () => {
    void it('returns true when default backend file exists', () => {
      const root = makeTmpDir();
      const dir = path.join(root, 'amplify');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'backend.ts'), '// backend');

      const locator = new BackendLocator(root);
      assert.strictEqual(locator.exists(), true);
    });

    void it('returns false when no backend file exists', () => {
      const root = makeTmpDir();
      const locator = new BackendLocator(root);
      assert.strictEqual(locator.exists(), false);
    });

    void it('returns true for hosting when hosting.ts exists', () => {
      const root = makeTmpDir();
      const dir = path.join(root, 'amplify');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'hosting.ts'), '// hosting');

      const locator = new BackendLocator(root, path.join('amplify', 'hosting'));
      assert.strictEqual(locator.exists(), true);
    });

    void it('returns false for hosting when only backend.ts exists', () => {
      const root = makeTmpDir();
      const dir = path.join(root, 'amplify');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'backend.ts'), '// backend');

      const locator = new BackendLocator(root, path.join('amplify', 'hosting'));
      assert.strictEqual(locator.exists(), false);
    });

    void it('returns true for .mjs extension', () => {
      const root = makeTmpDir();
      const dir = path.join(root, 'amplify');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'backend.mjs'), '// mjs');

      const locator = new BackendLocator(root);
      assert.strictEqual(locator.exists(), true);
    });

    void it('returns true for .cjs extension', () => {
      const root = makeTmpDir();
      const dir = path.join(root, 'amplify');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'hosting.cjs'), '// cjs');

      const locator = new BackendLocator(root, path.join('amplify', 'hosting'));
      assert.strictEqual(locator.exists(), true);
    });
  });
});
