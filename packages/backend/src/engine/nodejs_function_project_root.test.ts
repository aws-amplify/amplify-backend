import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveNodejsFunctionBundlingRoot } from './nodejs_function_project_root.js';

/**
 * Unit coverage for {@link resolveNodejsFunctionBundlingRoot}. Because both
 * callers capture the result in a module-level constant, a bug here surfaces
 * only as a `PathNotUnderRoot` synth error with no obvious link back to this
 * helper — so exercise each branch directly with a temp-dir fixture.
 */
void describe('resolveNodejsFunctionBundlingRoot', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'bundling-root-')),
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const makeDirs = (relative: string): string => {
    const dir = path.join(tempDir, relative);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  };

  const touch = (file: string): void => {
    fs.writeFileSync(file, '');
  };

  void it('returns the handler dir itself when a lock file sits alongside the handler', () => {
    const handlerDir = makeDirs('pkg/lib/handler');
    touch(path.join(handlerDir, 'package-lock.json'));

    const result = resolveNodejsFunctionBundlingRoot(
      handlerDir,
      path.join(tempDir, 'pkg'),
    );

    assert.strictEqual(result.projectRoot, handlerDir);
    assert.strictEqual(
      result.depsLockFilePath,
      path.join(handlerDir, 'package-lock.json'),
    );
  });

  void it('walks up to the nearest ancestor that has a lock file', () => {
    const projectRoot = makeDirs('project');
    const handlerDir = makeDirs('project/pkg/lib/handler');
    touch(path.join(projectRoot, 'package-lock.json'));

    const result = resolveNodejsFunctionBundlingRoot(
      handlerDir,
      path.join(tempDir, 'project/pkg'),
    );

    assert.strictEqual(result.projectRoot, projectRoot);
    assert.strictEqual(
      result.depsLockFilePath,
      path.join(projectRoot, 'package-lock.json'),
    );
  });

  void it('recognizes non-npm lock file formats (e.g. pnpm)', () => {
    const projectRoot = makeDirs('project');
    const handlerDir = makeDirs('project/pkg/lib/handler');
    touch(path.join(projectRoot, 'pnpm-lock.yaml'));

    const result = resolveNodejsFunctionBundlingRoot(
      handlerDir,
      path.join(tempDir, 'project/pkg'),
    );

    assert.strictEqual(result.projectRoot, projectRoot);
    assert.strictEqual(
      result.depsLockFilePath,
      path.join(projectRoot, 'pnpm-lock.yaml'),
    );
  });

  void it('stops at the FIRST ancestor with a lock file, not a higher one', () => {
    const outerRoot = makeDirs('outer');
    const innerRoot = makeDirs('outer/inner');
    const handlerDir = makeDirs('outer/inner/lib/handler');
    // Lock files at two levels — the nearest (inner) must win.
    touch(path.join(outerRoot, 'package-lock.json'));
    touch(path.join(innerRoot, 'package-lock.json'));

    const result = resolveNodejsFunctionBundlingRoot(
      handlerDir,
      path.join(tempDir, 'outer/inner'),
    );

    assert.strictEqual(result.projectRoot, innerRoot);
    assert.strictEqual(
      result.depsLockFilePath,
      path.join(innerRoot, 'package-lock.json'),
    );
  });

  void it('falls back to the package root with no lock file when none is found above the handler', () => {
    // tempDir has no lock file anywhere up to the filesystem root.
    const handlerDir = makeDirs('pkg/lib/handler');
    const packageRootFallback = path.join(tempDir, 'pkg');

    const result = resolveNodejsFunctionBundlingRoot(
      handlerDir,
      packageRootFallback,
    );

    assert.strictEqual(result.projectRoot, path.normalize(packageRootFallback));
    assert.strictEqual(result.depsLockFilePath, undefined);
  });
});
