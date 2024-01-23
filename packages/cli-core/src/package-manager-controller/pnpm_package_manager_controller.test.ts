import fsp from 'fs/promises';
import path from 'path';
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'assert';
import { execa } from 'execa';
import { PnpmPackageManagerController } from './pnpm_package_manager_controller.js';

void describe('PnpmPackageManagerController', () => {
  const fspMock = mock.fn(() => Promise.resolve());
  const pathMock = {
    resolve: mock.fn(),
  };
  const execaMock = mock.fn(() => Promise.resolve());
  const executeWithDebugLoggerMock = mock.fn(() => Promise.resolve());

  beforeEach(() => {
    fspMock.mock.resetCalls();
    pathMock.resolve.mock.resetCalls();
    execaMock.mock.resetCalls();
    executeWithDebugLoggerMock.mock.resetCalls();
  });

  void describe('installDependencies', () => {
    const existsSyncMock = mock.fn(() => true);
    const pnpmPackageManagerController = new PnpmPackageManagerController(
      '/testProjectRoot',
      fspMock as unknown as typeof fsp,
      pathMock as unknown as typeof path,
      execaMock as unknown as typeof execa,
      executeWithDebugLoggerMock,
      existsSyncMock
    );
    void it('runs pnpm install with the correct arguments', async () => {
      await pnpmPackageManagerController.installDependencies(
        ['testPackage1', 'testPackage2'],
        'dev'
      );
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
      assert.deepEqual(executeWithDebugLoggerMock.mock.calls[0].arguments, [
        '/testProjectRoot',
        'pnpm',
        ['install', 'testPackage1', 'testPackage2', '-D'],
        execaMock,
      ]);
    });

    void it('runs pnpm install with the correct arguments for prod dependencies', async () => {
      await pnpmPackageManagerController.installDependencies(
        ['testPackage1', 'testPackage2'],
        'prod'
      );
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
      assert.deepEqual(executeWithDebugLoggerMock.mock.calls[0].arguments, [
        '/testProjectRoot',
        'pnpm',
        ['install', 'testPackage1', 'testPackage2'],
        execaMock,
      ]);
    });
  });

  void describe('getWelcomeMessage', () => {
    void it('returns the correct welcome message', () => {
      const existsSyncMock = mock.fn(() => true);
      const pnpmPackageManagerController = new PnpmPackageManagerController(
        '/testProjectRoot',
        fspMock as unknown as typeof fsp,
        pathMock as unknown as typeof path,
        execaMock as unknown as typeof execa,
        executeWithDebugLoggerMock,
        existsSyncMock
      );

      assert.equal(
        pnpmPackageManagerController.getWelcomeMessage(),
        'Run `pnpm amplify help` for a list of available commands. \nGet started by running `pnpm amplify sandbox`.'
      );
    });
  });

  void describe('initializeProject', () => {
    void it('does nothing if package.json already exists', async () => {
      let existsSyncMockValue = false;
      const existsSyncMock = mock.fn(() => {
        existsSyncMockValue = !existsSyncMockValue;
        return existsSyncMockValue;
      });
      const pnpmPackageManagerController = new PnpmPackageManagerController(
        '/testProjectRoot',
        fspMock as unknown as typeof fsp,
        pathMock as unknown as typeof path,
        execaMock as unknown as typeof execa,
        executeWithDebugLoggerMock,
        existsSyncMock
      );

      await pnpmPackageManagerController.initializeProject();
      assert.equal(existsSyncMock.mock.callCount(), 1);
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 0);
    });

    void it('runs npm init if package.json does not exist', async () => {
      let existsSyncMockValue = true;
      const existsSyncMock = mock.fn(() => {
        existsSyncMockValue = !existsSyncMockValue;
        return existsSyncMockValue;
      });
      const pnpmPackageManagerController = new PnpmPackageManagerController(
        '/testProjectRoot',
        fspMock as unknown as typeof fsp,
        pathMock as unknown as typeof path,
        execaMock as unknown as typeof execa,
        executeWithDebugLoggerMock,
        existsSyncMock
      );

      await pnpmPackageManagerController.initializeProject();
      assert.equal(existsSyncMock.mock.callCount(), 2);
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
    });
  });

  void describe('initializeTsConfig', () => {
    void it('initialize tsconfig.json', async () => {
      const existsSyncMock = mock.fn(() => true);
      const pnpmPackageManagerController = new PnpmPackageManagerController(
        '/testProjectRoot',
        fspMock as unknown as typeof fsp,
        pathMock as unknown as typeof path,
        execaMock as unknown as typeof execa,
        executeWithDebugLoggerMock,
        existsSyncMock
      );
      await pnpmPackageManagerController.initializeTsConfig('./amplify');
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
    });
  });
});
