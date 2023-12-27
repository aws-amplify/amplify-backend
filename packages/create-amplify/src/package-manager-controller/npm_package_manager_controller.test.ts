import fsp from 'fs/promises';
import path from 'path';
import { describe, it, mock } from 'node:test';
import assert from 'assert';
import { execa } from 'execa';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';

void describe('NpmPackageManagerController', () => {
  void describe('installDependencies', () => {
    void it('runs npm install with the correct arguments', async () => {
      const existsSyncMock = mock.fn(() => true);
      const fspMock = mock.fn(() => Promise.resolve()) as unknown as typeof fsp;
      const pathMock = {
        resolve: mock.fn(),
      } as unknown as typeof path;
      const execaMock = mock.fn(() =>
        Promise.resolve()
      ) as unknown as typeof execa;
      const executeWithDebugLoggerMock = mock.fn(() => Promise.resolve());
      const npmPackageManagerController = new NpmPackageManagerController(
        '/testProjectRoot',
        fspMock,
        pathMock,
        execaMock,
        executeWithDebugLoggerMock,
        existsSyncMock
      );

      await npmPackageManagerController.installDependencies(
        ['testPackage1', 'testPackage2'],
        'dev'
      );
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
      assert.deepEqual(executeWithDebugLoggerMock.mock.calls[0].arguments, [
        '/testProjectRoot',
        'npm',
        ['install', 'testPackage1', 'testPackage2', '-D'],
        execaMock,
      ]);
    });

    void it('runs npm install with the correct arguments for prod dependencies', async () => {
      const existsSyncMock = mock.fn(() => true);
      const fspMock = mock.fn(() => Promise.resolve()) as unknown as typeof fsp;
      const pathMock = {
        resolve: mock.fn(),
      } as unknown as typeof path;
      const execaMock = mock.fn(() =>
        Promise.resolve()
      ) as unknown as typeof execa;
      const executeWithDebugLoggerMock = mock.fn(() => Promise.resolve());
      const npmPackageManagerController = new NpmPackageManagerController(
        '/testProjectRoot',
        fspMock,
        pathMock,
        execaMock,
        executeWithDebugLoggerMock,
        existsSyncMock
      );

      await npmPackageManagerController.installDependencies(
        ['testPackage1', 'testPackage2'],
        'prod'
      );
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
      assert.deepEqual(executeWithDebugLoggerMock.mock.calls[0].arguments, [
        '/testProjectRoot',
        'npm',
        ['install', 'testPackage1', 'testPackage2'],
        execaMock,
      ]);
    });
  });

  void describe('getWelcomeMessage', () => {
    void it('returns the correct welcome message', () => {
      const existsSyncMock = mock.fn(() => true);
      const fspMock = mock.fn(() => Promise.resolve()) as unknown as typeof fsp;
      const pathMock = {
        resolve: mock.fn(),
      } as unknown as typeof path;
      const execaMock = mock.fn(() =>
        Promise.resolve()
      ) as unknown as typeof execa;
      const executeWithDebugLoggerMock = mock.fn(() => Promise.resolve());
      const npmPackageManagerController = new NpmPackageManagerController(
        '/testProjectRoot',
        fspMock,
        pathMock,
        execaMock,
        executeWithDebugLoggerMock,
        existsSyncMock
      );

      assert.equal(
        npmPackageManagerController.getWelcomeMessage(),
        'Run `npx amplify help` for a list of available commands. \nGet started by running `npx amplify sandbox`.'
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
      const fspMock = mock.fn(() => Promise.resolve()) as unknown as typeof fsp;
      const pathMock = {
        resolve: mock.fn(),
      } as unknown as typeof path;
      const execaMock = mock.fn(() =>
        Promise.resolve()
      ) as unknown as typeof execa;
      const executeWithDebugLoggerMock = mock.fn(() => Promise.resolve());
      const npmPackageManagerController = new NpmPackageManagerController(
        '/testProjectRoot',
        fspMock,
        pathMock,
        execaMock,
        executeWithDebugLoggerMock,
        existsSyncMock
      );

      await npmPackageManagerController.initializeProject();
      assert.equal(existsSyncMock.mock.callCount(), 1);
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 0);
    });

    void it('runs npm init if package.json does not exist', async () => {
      let existsSyncMockValue = true;
      const existsSyncMock = mock.fn(() => {
        existsSyncMockValue = !existsSyncMockValue;
        return existsSyncMockValue;
      });
      const fspMock = mock.fn(() => Promise.resolve()) as unknown as typeof fsp;
      const pathMock = {
        resolve: mock.fn(),
      } as unknown as typeof path;
      const execaMock = mock.fn(() =>
        Promise.resolve()
      ) as unknown as typeof execa;
      const executeWithDebugLoggerMock = mock.fn(() => Promise.resolve());
      const npmPackageManagerController = new NpmPackageManagerController(
        '/testProjectRoot',
        fspMock,
        pathMock,
        execaMock,
        executeWithDebugLoggerMock,
        existsSyncMock
      );

      await npmPackageManagerController.initializeProject();
      assert.equal(existsSyncMock.mock.callCount(), 2);
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
    });
  });

  void describe('initializeTsConfig', () => {
    void it('initialize tsconfig.json', async () => {
      const existsSyncMock = mock.fn(() => true);
      const fspMock = mock.fn(() => Promise.resolve()) as unknown as typeof fsp;
      const pathMock = {
        resolve: mock.fn(),
      } as unknown as typeof path;
      const execaMock = mock.fn(() =>
        Promise.resolve()
      ) as unknown as typeof execa;
      const executeWithDebugLoggerMock = mock.fn(() => Promise.resolve());
      const npmPackageManagerController = new NpmPackageManagerController(
        '/testProjectRoot',
        fspMock,
        pathMock,
        execaMock,
        executeWithDebugLoggerMock,
        existsSyncMock
      );

      await npmPackageManagerController.initializeTsConfig('./amplify');
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
    });
  });
});
