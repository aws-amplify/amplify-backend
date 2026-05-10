import fsp from 'fs/promises';
import path from 'path';
import { EOL } from 'os';
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'assert';
import { execa } from 'execa';
import { PnpmPackageManagerController } from './pnpm_package_manager_controller.js';
import { executeWithDebugLogger } from './execute_with_debugger_logger.js';
import { LockFileReader } from './lock-file-reader/types.js';

void describe('PnpmPackageManagerController', () => {
  const fspMock = {
    readFile: mock.fn(() =>
      Promise.resolve(JSON.stringify({ compilerOptions: {} })),
    ),
    writeFile: mock.fn(() => Promise.resolve()),
  };
  const pathMock = {
    resolve: mock.fn((...args: string[]) => args.join('/')),
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
    const pnpmPackageManagerController = new PnpmPackageManagerController(
      '/testProjectRoot',
      fspMock as unknown as typeof fsp,
      pathMock as unknown as typeof path,
      execaMock as unknown as typeof execa,
      executeWithDebugLoggerMock as unknown as typeof executeWithDebugLogger,
      existsSyncMock,
    );
    void it('runs pnpm install with the correct arguments', async () => {
      await pnpmPackageManagerController.installDependencies(
        ['testPackage1', 'testPackage2'],
        'dev',
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
        'prod',
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

  void describe('initializeProject', () => {
    void it('skips init if package.json already exists and creates pnpm-workspace.yaml', async () => {
      let callCount = 0;
      const existsSyncMock = mock.fn(() => {
        callCount++;
        // Call 1: package.json check → exists
        // Call 2: pnpm-workspace.yaml check → does not exist
        return callCount === 1;
      });
      const pnpmPackageManagerController = new PnpmPackageManagerController(
        '/testProjectRoot',
        fspMock as unknown as typeof fsp,
        pathMock as unknown as typeof path,
        execaMock as unknown as typeof execa,
        executeWithDebugLoggerMock as unknown as typeof executeWithDebugLogger,
        existsSyncMock,
      );

      await pnpmPackageManagerController.initializeProject();
      assert.equal(existsSyncMock.mock.callCount(), 2);
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 0);
      assert.equal(fspMock.writeFile.mock.callCount(), 1);
      const writeArgs = fspMock.writeFile.mock.calls[0]
        .arguments as unknown as string[];
      assert.ok(writeArgs[0].includes('pnpm-workspace.yaml'));
      assert.ok(writeArgs[1].includes('allowBuilds:'));
      assert.ok(writeArgs[1].includes('esbuild: true'));
      assert.ok(writeArgs[1].includes("'@parcel/watcher': true"));
      assert.ok(writeArgs[1].includes('core-js: true'));
    });

    void it('runs pnpm init if package.json does not exist and creates pnpm-workspace.yaml', async () => {
      let callCount = 0;
      const existsSyncMock = mock.fn(() => {
        callCount++;
        // Call 1: package.json check before init → does not exist
        // Call 2: package.json check after init → exists
        // Call 3: pnpm-workspace.yaml check → does not exist
        return callCount === 2;
      });
      const pnpmPackageManagerController = new PnpmPackageManagerController(
        '/testProjectRoot',
        fspMock as unknown as typeof fsp,
        pathMock as unknown as typeof path,
        execaMock as unknown as typeof execa,
        executeWithDebugLoggerMock as unknown as typeof executeWithDebugLogger,
        existsSyncMock,
      );

      await pnpmPackageManagerController.initializeProject();
      assert.equal(existsSyncMock.mock.callCount(), 3);
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
      assert.equal(fspMock.writeFile.mock.callCount(), 1);
    });

    void it('appends to existing pnpm-workspace.yaml without allowBuilds', async () => {
      const existsSyncMock = mock.fn(() => {
        // Call 1: package.json check → exists
        // Call 2: pnpm-workspace.yaml check → exists
        return true;
      });
      const fspMockWithExistingWorkspace = {
        readFile: mock.fn(() => Promise.resolve('packages:\n  - "packages/*"')),
        writeFile: mock.fn(() => Promise.resolve()),
      };
      const pnpmPackageManagerController = new PnpmPackageManagerController(
        '/testProjectRoot',
        fspMockWithExistingWorkspace as unknown as typeof fsp,
        pathMock as unknown as typeof path,
        execaMock as unknown as typeof execa,
        executeWithDebugLoggerMock as unknown as typeof executeWithDebugLogger,
        existsSyncMock,
      );

      await pnpmPackageManagerController.initializeProject();
      assert.equal(fspMockWithExistingWorkspace.writeFile.mock.callCount(), 1);
      const writtenContent = (
        fspMockWithExistingWorkspace.writeFile.mock.calls[0]
          .arguments as unknown as string[]
      )[1];
      assert.ok(writtenContent.startsWith('packages:'));
      assert.ok(writtenContent.includes('allowBuilds:'));
      assert.ok(writtenContent.includes('esbuild: true'));
      assert.ok(writtenContent.includes("'@parcel/watcher': true"));
      assert.ok(writtenContent.includes('core-js: true'));
    });

    void it('does not modify pnpm-workspace.yaml if allowBuilds already configured', async () => {
      const existsSyncMock = mock.fn(() => true);
      const fspMockWithConfig = {
        readFile: mock.fn(() =>
          Promise.resolve(
            `allowBuilds:${EOL}  esbuild: true${EOL}  '@parcel/watcher': true${EOL}  core-js: true`,
          ),
        ),
        writeFile: mock.fn(() => Promise.resolve()),
      };
      const pnpmPackageManagerController = new PnpmPackageManagerController(
        '/testProjectRoot',
        fspMockWithConfig as unknown as typeof fsp,
        pathMock as unknown as typeof path,
        execaMock as unknown as typeof execa,
        executeWithDebugLoggerMock as unknown as typeof executeWithDebugLogger,
        existsSyncMock,
      );

      await pnpmPackageManagerController.initializeProject();
      assert.equal(fspMockWithConfig.writeFile.mock.callCount(), 0);
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
        executeWithDebugLoggerMock as unknown as typeof executeWithDebugLogger,
        existsSyncMock,
      );
      await pnpmPackageManagerController.initializeTsConfig('./amplify');
      assert.equal(executeWithDebugLoggerMock.mock.callCount(), 0);
      assert.equal(fspMock.writeFile.mock.callCount(), 1);
    });
  });

  void describe('getDependencies', () => {
    void it('successfully returns dependency versions', async () => {
      const existsSyncMock = mock.fn(() => true);
      const lockFileReaderMock = {
        getLockFileContentsFromCwd: async () =>
          Promise.resolve({
            dependencies: [
              {
                name: 'aws-cdk',
                version: '1.2.3',
              },
              {
                name: 'aws-cdk-lib',
                version: '12.13.14',
              },
              {
                name: 'test_dep',
                version: '1.23.45',
              },
              {
                name: 'some_other_dep',
                version: '12.1.3',
              },
            ],
          }),
      } as LockFileReader;
      const pnpmPackageManagerController = new PnpmPackageManagerController(
        '/testProjectRoot',
        fspMock as unknown as typeof fsp,
        pathMock as unknown as typeof path,
        execaMock as unknown as typeof execa,
        executeWithDebugLoggerMock as unknown as typeof executeWithDebugLogger,
        existsSyncMock,
        lockFileReaderMock,
      );
      const dependencyVersions =
        await pnpmPackageManagerController.tryGetDependencies();
      const expectedVersions = [
        {
          name: 'aws-cdk',
          version: '1.2.3',
        },
        {
          name: 'aws-cdk-lib',
          version: '12.13.14',
        },
        {
          name: 'test_dep',
          version: '1.23.45',
        },
        {
          name: 'some_other_dep',
          version: '12.1.3',
        },
      ];

      assert.deepEqual(dependencyVersions, expectedVersions);
    });
  });
});
