import { after, before, describe, it } from 'node:test';
import assert from 'assert';
import { MinimalWithTypescriptIdiomTestProjectCreator } from '../test-project-setup/minimal_with_typescript_idioms.js';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../setup_test_directory.js';
import { TestProjectBase } from '../test-project-setup/test_project_base.js';
import { execa } from 'execa';

const betaEndpoint = 'https://beta.notices.cli.amplify.aws/notices.json';

void describe('Notices', () => {
  const projectCreator = new MinimalWithTypescriptIdiomTestProjectCreator();
  let testProject: TestProjectBase;

  before(async () => {
    await createTestDirectory(rootTestDir);
    testProject = await projectCreator.createProject(rootTestDir);
  });
  after(async () => {
    await deleteTestDirectory(rootTestDir);
  });

  void it('lists and acknowledges notice', async () => {
    const { stdout } = await execa('npx', ['ampx', 'notices', 'list'], {
      cwd: testProject.projectDirPath,
      env: {
        AMPLIFY_BACKEND_NOTICES_ENDPOINT: betaEndpoint,
      },
    });
    assert.ok(
      stdout.includes('This is a test notice'),
      `${stdout} must include 'This is a test notice'`
    );
  });
});
