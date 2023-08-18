import { describe, it, mock } from 'node:test';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
import assert from 'assert';

describe('InitialProjectFileGenerator', async () => {
  it('creates target directory and copies files', async () => {
    const fsMock = {
      mkdir: mock.fn(),
      cp: mock.fn(),
    };
    const initialProjectFileGenerator = new InitialProjectFileGenerator(
      '/testProjectRoot',
      fsMock as never
    );
    await initialProjectFileGenerator.generateInitialProjectFiles();

    assert.deepStrictEqual(fsMock.mkdir.mock.calls[0].arguments, [
      '/testProjectRoot/amplify',
      { recursive: true },
    ]);
    assert.deepStrictEqual(fsMock.cp.mock.calls[0].arguments, [
      new URL('../templates/basic-auth-data', import.meta.url),
      '/testProjectRoot/amplify',
      { recursive: true },
    ]);
  });
});
