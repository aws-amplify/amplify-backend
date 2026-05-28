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

/**
 * Materialise a fake `node_modules/<name>/package.json` so `local-pkg`'s
 * `isPackageExists` / `getPackageInfoSync` can resolve the package via
 * Node's module resolution. Detection is now installed-package based,
 * so a `package.json` declaration alone is not enough.
 */
const installFakePackage = (
  projectDir: string,
  name: string,
  version = '1.0.0',
): void => {
  const pkgDir = path.join(projectDir, 'node_modules', ...name.split('/'));
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(
    path.join(pkgDir, 'package.json'),
    JSON.stringify({ name, version, main: 'index.js' }),
  );
  // local-pkg uses Node's `createRequire` → resolveFrom; both need
  // a "main" file to exist OR an `exports` map. Drop a stub so the
  // resolver doesn't fail on packages we never actually load.
  fs.writeFileSync(path.join(pkgDir, 'index.js'), '');
};

void describe('detectFramework', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-detect-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('detects nextjs when next is installed', () => {
    installFakePackage(tmpDir, 'next', '14.0.0');
    assert.strictEqual(detectFramework(tmpDir), 'nextjs');
  });

  void it('returns spa for React project without next installed', () => {
    installFakePackage(tmpDir, 'react', '18.0.0');
    installFakePackage(tmpDir, 'vite', '5.0.0');
    assert.strictEqual(detectFramework(tmpDir), 'spa');
  });

  void it('returns spa when no package.json exists', () => {
    // No package.json, no node_modules — nothing to detect.
    assert.strictEqual(detectFramework(tmpDir), 'spa');
  });

  void it('returns spa for project with empty dependencies', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'my-app', dependencies: {} }),
    );
    assert.strictEqual(detectFramework(tmpDir), 'spa');
  });

  void it('returns spa when package.json is corrupted (detection no longer parses it)', () => {
    // detectFramework probes node_modules now — package.json syntax
    // doesn't matter. Corrupt files surface elsewhere (build phase).
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{ invalid json !!!');
    assert.strictEqual(detectFramework(tmpDir), 'spa');
  });

  void it('detects astro when astro is installed', () => {
    installFakePackage(tmpDir, 'astro', '5.0.0');
    assert.strictEqual(detectFramework(tmpDir), 'astro');
  });

  void it('returns spa when astro is declared in package.json but NOT installed (npm install was skipped)', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { astro: '^5.0.0' } }),
    );
    // No node_modules/astro/ — declared-but-not-installed must not
    // resolve to 'astro'. This is the bug local-pkg fixes.
    assert.strictEqual(detectFramework(tmpDir), 'spa');
  });

  void it('prefers nitro over astro when both are installed', () => {
    installFakePackage(tmpDir, 'astro', '5.0.0');
    installFakePackage(tmpDir, 'nitropack', '2.0.0');
    assert.strictEqual(detectFramework(tmpDir), 'nitro');
  });

  void it('detects nitro from any of nuxt / @solidjs/start / @analogjs/platform-server / @tanstack/start', () => {
    for (const pkg of [
      'nuxt',
      '@solidjs/start',
      '@analogjs/platform-server',
      '@tanstack/start',
    ]) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-nitro-'));
      try {
        installFakePackage(dir, pkg, '1.0.0');
        assert.strictEqual(detectFramework(dir), 'nitro', `pkg=${pkg}`);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
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
