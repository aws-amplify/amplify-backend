import { describe, it, mock } from 'node:test';
import { NpmProjectInitializer } from './npm_project_initializer.js';
import assert from 'assert';
import { PackageManagerBase } from '../package-manager-controller/index.js';

void describe('InitializedEnsurer', () => {
  const packageManager = new PackageManagerBase();
  void it('does nothing if package.json already exists', async () => {
    const execaMock = mock.fn();
    const npmInitializedEnsurer = new NpmProjectInitializer('/testProjectRoot');
    await npmInitializedEnsurer.ensureInitialized();
    assert.equal(execaMock.mock.callCount(), 0);
  });

  void it('runs `npm init` if no package.json exists', async () => {
    const execaMock = mock.fn();
    const npmInitializedEnsurer = new NpmProjectInitializer('/testProjectRoot');
    await npmInitializedEnsurer.ensureInitialized();
    assert.equal(execaMock.mock.callCount(), 1);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      packageManager.getPackageManager('npm'),
      ['init', '--yes'],
      { stdin: 'inherit', cwd: '/testProjectRoot' },
    ]);
  });

  void it('throws if npm init rejects', async () => {
    const npmInitializedEnsurer = new NpmProjectInitializer('/testProjectRoot');
    await assert.rejects(() => npmInitializedEnsurer.ensureInitialized(), {
      message:
        '`npm init` did not exit successfully. Initialize a valid JavaScript package before continuing.',
    });
  });

  void it('throws if package.json does not exist after npm init', async () => {
    const npmInitializedEnsurer = new NpmProjectInitializer('/testProjectRoot');
    await assert.rejects(() => npmInitializedEnsurer.ensureInitialized(), {
      message:
        'package.json does not exist after running `npm init`. Initialize a valid JavaScript package before continuing.',
    });
  });
});
