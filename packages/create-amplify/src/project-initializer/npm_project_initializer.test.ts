import { describe, it, mock } from 'node:test';
import { NpmProjectInitializer } from './npm_project_initializer.js';
import assert from 'assert';
import { PackageManagerControllerFactory } from '../package-manager-controller/index.js';

void describe('InitializedEnsurer', () => {
  const packageManagerController = new PackageManagerControllerFactory();
  const packageManager = packageManagerController.getPackageManager();
  void it('does nothing if package.json already exists', async () => {
    const execaMock = mock.fn();
    const packageJsonExists = mock.fn(() => true);
    const npmInitializedEnsurer = new NpmProjectInitializer(
      '/testProjectRoot',
      packageJsonExists
    );
    await npmInitializedEnsurer.ensureInitialized();
    assert.equal(execaMock.mock.callCount(), 0);
  });

  void it('runs `npm init` if no package.json exists', async () => {
    const execaMock = mock.fn();
    const packageJsonExists = mock.fn(() => false);
    const npmInitializedEnsurer = new NpmProjectInitializer(
      '/testProjectRoot',
      packageJsonExists
    );
    await npmInitializedEnsurer.ensureInitialized();
    assert.equal(execaMock.mock.callCount(), 1);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      packageManager,
      ['init', '--yes'],
      { stdin: 'inherit', cwd: '/testProjectRoot' },
    ]);
  });

  void it('throws if npm init rejects', async () => {
    const packageJsonExists = mock.fn(() => true);
    const npmInitializedEnsurer = new NpmProjectInitializer(
      '/testProjectRoot',
      packageJsonExists
    );
    await assert.rejects(() => npmInitializedEnsurer.ensureInitialized(), {
      message:
        '`npm init` did not exit successfully. Initialize a valid JavaScript package before continuing.',
    });
  });

  void it('throws if package.json does not exist after npm init', async () => {
    const packageJsonExists = mock.fn(() => true);
    const npmInitializedEnsurer = new NpmProjectInitializer(
      '/testProjectRoot',
      packageJsonExists
    );
    await assert.rejects(() => npmInitializedEnsurer.ensureInitialized(), {
      message:
        'package.json does not exist after running `npm init`. Initialize a valid JavaScript package before continuing.',
    });
  });
});
