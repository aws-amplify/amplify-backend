import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { resolveBundlingRoots } from './bundling_roots.js';

void describe('resolveBundlingRoots', () => {
  void it('resolves the nearest ancestor containing a lock file', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bundling-roots-'));
    const lockFilePath = path.join(root, 'package-lock.json');
    fs.writeFileSync(lockFilePath, '{}');
    const entryDir = path.join(root, 'packages', 'backend', 'lib', 'lambda');
    fs.mkdirSync(entryDir, { recursive: true });
    const entryPath = path.join(entryDir, 'handler.js');
    fs.writeFileSync(entryPath, '');

    assert.deepStrictEqual(resolveBundlingRoots(entryPath), {
      projectRoot: root,
      depsLockFilePath: lockFilePath,
    });
  });

  void it('prefers the closest lock file when several ancestors have one', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bundling-roots-'));
    fs.writeFileSync(path.join(root, 'package-lock.json'), '{}');
    const nested = path.join(root, 'nested');
    fs.mkdirSync(nested);
    const nestedLockFilePath = path.join(nested, 'yarn.lock');
    fs.writeFileSync(nestedLockFilePath, '');
    const entryPath = path.join(nested, 'handler.js');
    fs.writeFileSync(entryPath, '');

    assert.deepStrictEqual(resolveBundlingRoots(entryPath), {
      projectRoot: nested,
      depsLockFilePath: nestedLockFilePath,
    });
  });

  void it('resolves the lock file of the real amplify backend lambda entry', () => {
    const entryPath = fileURLToPath(
      new URL('./branch-linker/lambda/branch_linker.ts', import.meta.url),
    );
    const roots = resolveBundlingRoots(entryPath);
    assert.ok(roots);
    assert.ok(fs.existsSync(roots.depsLockFilePath));
    assert.ok(
      !path.relative(roots.projectRoot, entryPath).startsWith('..'),
      'entry must be under the resolved projectRoot',
    );
  });
});
