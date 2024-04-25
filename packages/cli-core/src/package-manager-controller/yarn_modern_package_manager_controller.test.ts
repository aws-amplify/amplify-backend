import fsp from 'fs/promises';
import path from 'path';
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'assert';
import { execa } from 'execa';
import { Printer } from '@aws-amplify/cli-core';
import { YarnModernPackageManagerController } from './yarn_modern_package_manager_controller.js';
import { executeWithDebugLogger } from './execute_with_debugger_logger.js';

void describe('YarnModernPackageManagerController', () => {
  const fspMock = {
    readFile: mock.fn(() =>
      Promise.resolve(JSON.stringify({ compilerOptions: {} }))
    ),
    writeFile: mock.fn(() => Promise.resolve()),
  };
  const pathMock = {
    resolve: mock.fn(() => '/testProjectRoot'),
  };
  const execaMock = mock.fn(() => Promise.resolve());
  const executeWithDebugLoggerMock = mock.fn(() => Promise.resolve());
  const printerMock = { log: mock.fn() } as unknown as Printer;

  beforeEach(() => {
    fspMock.readFile.mock.resetCalls();
    fspMock.writeFile.mock.resetCalls();
    pathMock.resolve.mock.resetCalls();
    execaMock.mock.resetCalls();
    executeWithDebugLoggerMock.mock.resetCalls();
  });

  void describe('installDependencies', () => {
    const existsSyncMock = mock.fn(() => true);
    const yarnModernPackageManagerController =
      new YarnModernPackageManagerController(
        '/testProjectRoot',
        printerMock as unknown as Printer,
        fspMock as unknown as typeof fsp,
        pathMock as unknown as typeof path,
        execaMock as unknown as typeof execa,
        executeWithDebugLoggerMock as unknown as typeof executeWithDebugLogger,
        existsSyncMock
      );
    void it('runs yarn add with the correct arguments', async () => {
      await yarnModernPackageManagerController.installDependencies(
        ['testPackage1', 'testPackage2'],
        'dev'
      );
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
    });

    void it('runs yarn add with the correct arguments for prod dependencies', async () => {
      await yarnModernPackageManagerController.installDependencies(
        ['testPackage1', 'testPackage2'],
        'prod'
      );
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
    });
  });

  void describe('initializeProject', () => {
    void it('does nothing if package.json already exists', async () => {
      let existsSyncMockValue = false;
      const existsSyncMock = mock.fn(() => {
        existsSyncMockValue = !existsSyncMockValue;
        return existsSyncMockValue;
      });
      const yarnModernPackageManagerController =
        new YarnModernPackageManagerController(
          '/testProjectRoot',
          printerMock as unknown as Printer,
          fspMock as unknown as typeof fsp,
          pathMock as unknown as typeof path,
          execaMock as unknown as typeof execa,
          executeWithDebugLoggerMock as unknown as typeof executeWithDebugLogger,
          existsSyncMock
        );

      await yarnModernPackageManagerController.initializeProject();
      assert.equal(existsSyncMock.mock.callCount(), 1);
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 0);
    });

    void it('runs yarn init if package.json does not exist', async () => {
      let existsSyncMockValue = true;
      const existsSyncMock = mock.fn(() => {
        existsSyncMockValue = !existsSyncMockValue;
        return existsSyncMockValue;
      });
      const yarnModernPackageManagerController =
        new YarnModernPackageManagerController(
          '/testProjectRoot',
          printerMock as unknown as Printer,
          fspMock as unknown as typeof fsp,
          pathMock as unknown as typeof path,
          execaMock as unknown as typeof execa,
          executeWithDebugLoggerMock as unknown as typeof executeWithDebugLogger,
          existsSyncMock
        );

      await yarnModernPackageManagerController.initializeProject();
      assert.equal(existsSyncMock.mock.callCount(), 2);
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
    });
  });

  void describe('initializeTsConfig', () => {
    void it('initialize tsconfig.json', async () => {
      const existsSyncMock = mock.fn(() => true);
      const yarnModernPackageManagerController =
        new YarnModernPackageManagerController(
          '/testProjectRoot',
          printerMock as unknown as Printer,
          fspMock as unknown as typeof fsp,
          pathMock as unknown as typeof path,
          execaMock as unknown as typeof execa,
          executeWithDebugLoggerMock as unknown as typeof executeWithDebugLogger,
          existsSyncMock
        );

      await yarnModernPackageManagerController.initializeTsConfig('./amplify');
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
      assert.equal(fspMock.writeFile.mock.callCount(), 2);
    });
  });
});
