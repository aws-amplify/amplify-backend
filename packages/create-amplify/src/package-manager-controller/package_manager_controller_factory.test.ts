import { describe, it, mock } from 'node:test';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';
import assert from 'assert';

void describe('PackageManagerController', () => {
  void it('executes expected dev dependency install command', async () => {
    const execaMock = mock.fn();
    const npmPackageManagerController = new NpmPackageManagerController();
    await npmPackageManagerController.installDependencies(['testDep'], 'dev');
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'npm',
      ['install', 'testDep', '-D'],
      { cwd: 'testPath', stdio: 'inherit' },
    ]);
  });

  void it('executes expected prod dependency install command', async () => {
    const execaMock = mock.fn();
    const npmPackageManagerController = new NpmPackageManagerController();
    await npmPackageManagerController.installDependencies(['testDep'], 'prod');
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'npm',
      ['install', 'testDep'],
      { cwd: 'testPath', stdin: 'inherit' },
    ]);
  });

  void it('throws when installing dependencies rejects', async () => {
    const npmPackageManagerController = new NpmPackageManagerController();
    await assert.rejects(
      () =>
        npmPackageManagerController.installDependencies(['testDep'], 'prod'),
      {
        message: `\`npm install testDep\` did not exit successfully.`,
      }
    );
  });

  void it('throws when installing dev dependencies rejects', async () => {
    const npmPackageManagerController = new NpmPackageManagerController();
    await assert.rejects(
      () =>
        npmPackageManagerController.installDependencies(['testDevDep'], 'dev'),
      {
        message: `\`npm install testDevDep --save-dev\` did not exit successfully.`,
      }
    );
  });
});
