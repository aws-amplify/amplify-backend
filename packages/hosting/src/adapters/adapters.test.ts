import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { detectFramework, getAdapter, registerAdapter } from './index.js';

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

void describe('registerAdapter', () => {
  void it('registers and retrieves a custom adapter', () => {
    const customAdapter = () => ({
      version: 1 as const,
      routes: [{ path: '/*', target: { kind: 'Static' as const } }],
      framework: { name: 'custom' },
    });

    registerAdapter('custom-test', customAdapter);
    const retrieved = getAdapter('custom-test');
    assert.strictEqual(retrieved, customAdapter);
  });
});
