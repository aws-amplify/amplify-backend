import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runBuild } from './runner.js';

void describe('runBuild', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'hosting-build-runner-test-'),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('executes a successful command and returns stdout', () => {
    const result = runBuild({
      command: 'echo "build success"',
      cwd: tmpDir,
    });

    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.stdout.includes('build success'));
  });

  void it('creates files during build (side effect)', () => {
    runBuild({
      command: 'echo "<html></html>" > index.html',
      cwd: tmpDir,
    });

    assert.ok(
      fs.existsSync(path.join(tmpDir, 'index.html')),
      'Build should have created index.html',
    );
  });

  void it('throws BuildError when command fails', () => {
    assert.throws(
      () =>
        runBuild({
          command: 'exit 1',
          cwd: tmpDir,
        }),
      (error: Error) => {
        assert.strictEqual(error.name, 'BuildError');
        assert.ok(error.message.includes('Build command failed'));
        return true;
      },
    );
  });

  void it('throws BuildError with non-zero exit code', () => {
    assert.throws(
      () =>
        runBuild({
          command: 'echo "some error" >&2 && exit 2',
          cwd: tmpDir,
        }),
      (error: Error) => {
        assert.strictEqual(error.name, 'BuildError');
        return true;
      },
    );
  });

  void it('throws BuildError for unknown command', () => {
    assert.throws(
      () =>
        runBuild({
          command: 'definitely_not_a_real_command_12345',
          cwd: tmpDir,
        }),
      (error: Error) => {
        assert.strictEqual(error.name, 'BuildError');
        return true;
      },
    );
  });

  void it('passes custom environment variables', () => {
    const result = runBuild({
      command: 'echo $MY_TEST_VAR',
      cwd: tmpDir,
      env: { MY_TEST_VAR: 'hello_from_env' },
    });

    assert.ok(result.stdout.includes('hello_from_env'));
  });

  void it('uses the specified working directory', () => {
    const subDir = path.join(tmpDir, 'subdir');
    fs.mkdirSync(subDir);

    const result = runBuild({
      command: 'pwd',
      cwd: subDir,
    });

    assert.ok(result.stdout.trim().endsWith('subdir'));
  });
});
