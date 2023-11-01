import { describe, it, mock } from 'node:test';
import { InitialProjectFileGenerator } from './initial_project_file_generator.js';
import assert from 'assert';
import * as path from 'path';

void describe('InitialProjectFileGenerator', () => {
  void it('creates target directory and copies files', async () => {
    const fsMock = {
      mkdir: mock.fn(),
      cp: mock.fn(),
      writeFile: mock.fn(),
    };
    const initialProjectFileGenerator = new InitialProjectFileGenerator(
      path.join(process.cwd(), 'testDir'),
      fsMock as never
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
});
