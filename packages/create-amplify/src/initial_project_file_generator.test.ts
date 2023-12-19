import { beforeEach, describe, it, mock } from 'node:test';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
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
    const initialProjectFileGenerator = new InitialProjectFileGenerator(
      path.join(process.cwd(), 'testDir'),
      fsMock as never,
      executeWithDebugLoggerMock as never
    );
    await initialProjectFileGenerator.generateInitialProjectFiles();

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
    const initialProjectFileGenerator = new InitialProjectFileGenerator(
      path.join(process.cwd(), 'testDir'),
      fsMock as never,
      executeWithDebugLoggerMock as never
    );
    await initialProjectFileGenerator.generateInitialProjectFiles();
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
          'es2022',
          '--moduleResolution',
          'bundler',
          '--target',
          'es2022',
        ],
      ]
    );
  });
});
