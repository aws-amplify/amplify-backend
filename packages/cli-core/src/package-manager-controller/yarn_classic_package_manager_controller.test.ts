import fsp from 'fs/promises';
import path from 'path';
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'assert';
import { execa } from 'execa';
import { YarnClassicPackageManagerController } from './yarn_classic_package_manager_controller.js';
import { executeWithDebugLogger } from './execute_with_debugger_logger.js';

void describe('YarnClassicPackageManagerController', () => {
  const fspMock = {
    readFile: mock.fn(() =>
      Promise.resolve(JSON.stringify({ compilerOptions: {} }))
    ),
    writeFile: mock.fn(() => Promise.resolve()),
  };
  const pathMock = {
    resolve: mock.fn(),
  };
  const execaMock = mock.fn(() => Promise.resolve());
  const executeWithDebugLoggerMock = mock.fn(() => Promise.resolve());

  beforeEach(() => {
    fspMock.readFile.mock.resetCalls();
    fspMock.writeFile.mock.resetCalls();
    pathMock.resolve.mock.resetCalls();
    execaMock.mock.resetCalls();
    executeWithDebugLoggerMock.mock.resetCalls();
  });

  void describe('installDependencies', () => {
    const existsSyncMock = mock.fn(() => true);
    const yarnClassicPackageManagerController =
      new YarnClassicPackageManagerController(
        '/testProjectRoot',
        fspMock as unknown as typeof fsp,
        pathMock as unknown as typeof path,
        execaMock as unknown as typeof execa,
        executeWithDebugLoggerMock as unknown as typeof executeWithDebugLogger,
        existsSyncMock
      );
    void it('runs yarn add with the correct arguments', async () => {
      await yarnClassicPackageManagerController.installDependencies(
        ['testPackage1', 'testPackage2'],
        'dev'
      );
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
      assert.deepEqual(executeWithDebugLoggerMock.mock.calls[0].arguments, [
        '/testProjectRoot',
        'yarn',
        ['add', 'testPackage1', 'testPackage2', '-D'],
        execaMock,
      ]);
    });

    void it('runs yarn add with the correct arguments for prod dependencies', async () => {
      await yarnClassicPackageManagerController.installDependencies(
        ['testPackage1', 'testPackage2'],
        'prod'
      );
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
      assert.deepEqual(executeWithDebugLoggerMock.mock.calls[0].arguments, [
        '/testProjectRoot',
        'yarn',
        ['add', 'testPackage1', 'testPackage2'],
        execaMock,
      ]);
    });
  });

  void describe('initializeProject', () => {
    void it('does nothing if package.json already exists', async () => {
      let existsSyncMockValue = false;
      const existsSyncMock = mock.fn(() => {
        existsSyncMockValue = !existsSyncMockValue;
        return existsSyncMockValue;
      });
      const yarnClassicPackageManagerController =
        new YarnClassicPackageManagerController(
          '/testProjectRoot',
          fspMock as unknown as typeof fsp,
          pathMock as unknown as typeof path,
          execaMock as unknown as typeof execa,
          executeWithDebugLoggerMock as unknown as typeof executeWithDebugLogger,
          existsSyncMock
        );

      await yarnClassicPackageManagerController.initializeProject();
      assert.equal(existsSyncMock.mock.callCount(), 1);
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 0);
    });

    void it('runs yarn init if package.json does not exist', async () => {
      let existsSyncMockValue = true;
      const existsSyncMock = mock.fn(() => {
        existsSyncMockValue = !existsSyncMockValue;
        return existsSyncMockValue;
      });
      const yarnClassicPackageManagerController =
        new YarnClassicPackageManagerController(
          '/testProjectRoot',
          fspMock as unknown as typeof fsp,
          pathMock as unknown as typeof path,
          execaMock as unknown as typeof execa,
          executeWithDebugLoggerMock as unknown as typeof executeWithDebugLogger,
          existsSyncMock
        );

      await yarnClassicPackageManagerController.initializeProject();
      assert.equal(existsSyncMock.mock.callCount(), 2);
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
    });
  });

  void describe('initializeTsConfig', () => {
    void it('initialize tsconfig.json', async () => {
      const existsSyncMock = mock.fn(() => true);
      const yarnClassicPackageManagerController =
        new YarnClassicPackageManagerController(
          '/testProjectRoot',
          fspMock as unknown as typeof fsp,
          pathMock as unknown as typeof path,
          execaMock as unknown as typeof execa,
          executeWithDebugLoggerMock as unknown as typeof executeWithDebugLogger,
          existsSyncMock
        );
      await yarnClassicPackageManagerController.initializeTsConfig('./amplify');
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
      assert.equal(fspMock.writeFile.mock.callCount(), 1);
    });
  });
});
