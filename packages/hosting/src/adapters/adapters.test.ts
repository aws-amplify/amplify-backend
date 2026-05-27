import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  detectFramework,
  getAdapter,
  readProjectDeps,
  readProjectDepsStrict,
} from './index.js';

void describe('detectFramework', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-detect-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('detects nextjs from package.json with next dependency', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { next: '^14.0.0', react: '^18.0.0' } }),
    );

    assert.strictEqual(detectFramework(tmpDir), 'nextjs');
  });

  void it('detects nextjs from devDependencies', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ devDependencies: { next: '15.0.0' } }),
    );

    assert.strictEqual(detectFramework(tmpDir), 'nextjs');
  });

  void it('returns spa for React project without next', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { react: '^18.0.0', vite: '^5.0.0' } }),
    );

    assert.strictEqual(detectFramework(tmpDir), 'spa');
  });

  void it('returns static when no package.json exists', () => {
    assert.strictEqual(detectFramework(tmpDir), 'static');
  });

  void it('returns spa for project with empty dependencies', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'my-app', dependencies: {} }),
    );

    assert.strictEqual(detectFramework(tmpDir), 'spa');
  });

  void it('throws PackageJsonParseError for corrupted package.json', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{ invalid json !!!');

    assert.throws(
      () => detectFramework(tmpDir),
      (error: Error) => {
        assert.strictEqual(error.name, 'PackageJsonParseError');
        return true;
      },
    );
  });

  void it('detects astro framework', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { astro: '^5.0.0' } }),
    );
    assert.strictEqual(detectFramework(tmpDir), 'astro');
  });

  void it('prefers nitro over astro when both are present', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        dependencies: { astro: '^5.0.0', nitropack: '^2.0.0' },
      }),
    );
    assert.strictEqual(detectFramework(tmpDir), 'nitro');
  });
});

void describe('readProjectDeps', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-deps-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('returns {} when package.json is missing', () => {
    assert.deepStrictEqual(readProjectDeps(tmpDir), {});
  });

  void it('returns {} when package.json is unparseable', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{ broken');
    assert.deepStrictEqual(readProjectDeps(tmpDir), {});
  });

  void it('reads dependencies', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { foo: '^1.0.0' } }),
    );
    assert.deepStrictEqual(readProjectDeps(tmpDir), { foo: '^1.0.0' });
  });

  void it('reads devDependencies', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ devDependencies: { typescript: '^5.0.0' } }),
    );
    assert.deepStrictEqual(readProjectDeps(tmpDir), { typescript: '^5.0.0' });
  });

  void it('reads peerDependencies', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ peerDependencies: { react: '^18.0.0' } }),
    );
    assert.deepStrictEqual(readProjectDeps(tmpDir), { react: '^18.0.0' });
  });

  void it('merges all three with peer > dev > deps precedence', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        dependencies: { foo: '1.0.0', shared: '1.0.0' },
        devDependencies: { bar: '1.0.0', shared: '2.0.0' },
        peerDependencies: { baz: '1.0.0', shared: '3.0.0' },
      }),
    );
    assert.deepStrictEqual(readProjectDeps(tmpDir), {
      foo: '1.0.0',
      bar: '1.0.0',
      baz: '1.0.0',
      shared: '3.0.0',
    });
  });

  void it('readProjectDepsStrict returns {} when missing but throws on parse error', () => {
    assert.deepStrictEqual(readProjectDepsStrict(tmpDir), {});
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{ broken');
    assert.throws(
      () => readProjectDepsStrict(tmpDir),
      (error: Error) => {
        assert.strictEqual(error.name, 'PackageJsonParseError');
        return true;
      },
    );
  });
});

void describe('getAdapter', () => {
  void it('returns spa adapter for "spa" framework', () => {
    const adapter = getAdapter('spa');
    assert.ok(typeof adapter === 'function');
  });

  void it('returns spa adapter for "static" framework', () => {
    const adapter = getAdapter('static');
    assert.ok(typeof adapter === 'function');
  });

  void it('returns nextjs adapter for "nextjs" framework', () => {
    const adapter = getAdapter('nextjs');
    assert.ok(typeof adapter === 'function');
  });

  void it('throws UnsupportedFrameworkError for unknown framework', () => {
    assert.throws(
      () => getAdapter('unknown-framework-xyz'),
      (error: Error) => {
        assert.strictEqual(error.name, 'UnsupportedFrameworkError');
        assert.ok(error.message.includes('unknown-framework-xyz'));
        return true;
      },
    );
  });
});
