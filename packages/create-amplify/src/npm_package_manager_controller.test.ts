import { describe, it, mock } from 'node:test';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';
import assert from 'assert';

describe('NpmPackageManagerController', async () => {
  it('executes expected dev dependency install command', async () => {
    const execaMock = mock.fn();
    const npmPackageManagerController = new NpmPackageManagerController(
      'testPath',
      execaMock as never
    );
    await npmPackageManagerController.installDependencies(['testDep'], 'dev');
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'npm',
      ['install', 'testDep', '--save-dev'],
      { cwd: 'testPath', stdio: 'inherit' },
    ]);
  });

  it('executes expected prod dependency install command', async () => {
    const execaMock = mock.fn();
    const npmPackageManagerController = new NpmPackageManagerController(
      'testPath',
      execaMock as never
    );
    await npmPackageManagerController.installDependencies(['testDep'], 'prod');
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'npm',
      ['install', 'testDep'],
      { cwd: 'testPath', stdio: 'inherit' },
    ]);
  });
});
