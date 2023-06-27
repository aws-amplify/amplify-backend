import { afterEach, beforeEach, describe, it } from 'node:test';
import path from 'path';
import url from 'url';
import { LocalDirectoryBackendProjectCreator } from './backend_project_creator.js';
import fs from 'fs/promises';
import assert from 'node:assert';

describe('backend project creator', () => {
  const testTemplatesDirectory = path.resolve(
    url.fileURLToPath(new URL('.', import.meta.url)),
    '..',
    'src',
    'test_utils',
    'test_templates'
  );

  const backendProjectCreator = new LocalDirectoryBackendProjectCreator(
    testTemplatesDirectory
  );

  let targetDirectory: string;

  beforeEach(async () => {
    targetDirectory = await fs.mkdtemp('backend_project');
  });

  afterEach(async () => {
    await fs.rm(targetDirectory, { recursive: true, force: true });
  });

  it('creates project from selected template', async () => {
    await backendProjectCreator.createFromTemplate(
      'test_template2',
      targetDirectory
    );

    const targetDirectoryEntries = await fs.readdir(targetDirectory, {
      withFileTypes: true,
    });
    assert.equal(targetDirectoryEntries.length, 2);
    assert.equal(targetDirectoryEntries[0].name, 'index.ts');
    assert.equal(targetDirectoryEntries[1].name, 'package.json');
    const content0 = await fs.readFile(
      path.join(targetDirectory, targetDirectoryEntries[0].name)
    );
    const content1 = await fs.readFile(
      path.join(targetDirectory, targetDirectoryEntries[1].name)
    );
    assert.match(content0.toString(), /template2/);
    assert.match(content1.toString(), /template2/);
  });

  it('fails if target directory is not empty', async () => {
    await fs.writeFile(path.join(targetDirectory, 'some_file.txt'), 'content');

    await assert.rejects(
      () =>
        backendProjectCreator.createFromTemplate(
          'test_template1',
          targetDirectory
        ),
      (err: Error) => {
        assert.equal(err.message, 'Target directory is not empty');
        return true;
      }
    );
  });

  it('fails if target directory does not exists', async () => {
    await assert.rejects(
      () =>
        backendProjectCreator.createFromTemplate(
          'test_template1',
          path.join(targetDirectory, 'does_not_exists')
        ),
      (err: Error) => {
        assert.equal(err.message, 'Target directory does not exists');
        return true;
      }
    );
  });

  it('fails if target directory is not a directory', async () => {
    const filePath = path.join(targetDirectory, 'some_file.txt');
    await fs.writeFile(filePath, 'content');

    await assert.rejects(
      () =>
        backendProjectCreator.createFromTemplate('test_template1', filePath),
      (err: Error) => {
        assert.equal(err.message, 'Target directory is not a directory');
        return true;
      }
    );
  });

  it('fails if template does not exist', async () => {
    await assert.rejects(
      () =>
        backendProjectCreator.createFromTemplate(
          'non_existing_template',
          targetDirectory
        ),
      (err: Error) => {
        assert.equal(
          err.message,
          'Template non_existing_template does not exist'
        );
        return true;
      }
    );
  });
});
