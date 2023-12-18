import { beforeEach, describe, it, mock } from 'node:test';
import { PackageManagerControllerFactory } from './package-manager-controller/package_manager_controller_factory.js';
import assert from 'assert';
import * as path from 'path';

void describe('InitialProjectFileGenerator', () => {
  const fsMock = {
    mkdir: mock.fn(),
    cp: mock.fn(),
    writeFile: mock.fn(),
  };
  const executeWithDebugLoggerMock = mock.fn();
  beforeEach(() => {
    executeWithDebugLoggerMock.mock.resetCalls();
  });

  void it('creates target directory and copies files', async () => {
    const packageManagerControllerFactory = new PackageManagerControllerFactory(
      './',
      'npm/9.6.7 node/v18.17.0 darwin arm64 workspaces/false'
    );
    const packageManagerController =
      packageManagerControllerFactory.getPackageManagerController();
    await packageManagerController.initializeAmplifyFolder();

    assert.deepStrictEqual(fsMock.mkdir.mock.calls[0].arguments, [
      path.join(process.cwd(), 'testDir', 'amplify'),
      { recursive: true },
    ]);
    assert.deepStrictEqual(fsMock.cp.mock.calls[0].arguments, [
      new URL('../templates/basic-auth-data/amplify', import.meta.url),
      path.join(process.cwd(), 'testDir', 'amplify'),
      { recursive: true },
    ]);
    assert.equal(
      fsMock.writeFile.mock.calls[0].arguments[0],
      path.join(process.cwd(), 'testDir', 'amplify', 'package.json')
    );
    assert.deepStrictEqual(
      JSON.parse(fsMock.writeFile.mock.calls[0].arguments[1]),
      { type: 'module' }
    );
  });

  void it('creates default tsconfig file', async () => {
    const packageManagerControllerFactory = new PackageManagerControllerFactory(
      './',
      'npm/9.6.7 node/v18.17.0 darwin arm64 workspaces/false'
    );
    const packageManagerController =
      packageManagerControllerFactory.getPackageManagerController();
    await packageManagerController.initializeAmplifyFolder();
    assert.equal(executeWithDebugLoggerMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      executeWithDebugLoggerMock.mock.calls[0].arguments.slice(0, 3),
      [
        path.join(process.cwd(), 'testDir', 'amplify'),
        'npx',
        [
          'tsc',
          '--init',
          '--resolveJsonModule',
          'true',
          '--module',
          'node16',
          '--moduleResolution',
          'node16',
          '--target',
          'es2022',
        ],
      ]
    );
  });
});
