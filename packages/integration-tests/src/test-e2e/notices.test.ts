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
import { configControllerFactory } from '@aws-amplify/platform-core';

const betaEndpoint = 'https://beta.notices.cli.amplify.aws/notices.json';

void describe('Notices', () => {
  const projectCreator = new MinimalWithTypescriptIdiomTestProjectCreator();
  let testProject: TestProjectBase;
  const configurationController =
    configControllerFactory.getInstance('notices.json');

  before(async () => {
    await configurationController.clear();
    await createTestDirectory(rootTestDir);
    testProject = await projectCreator.createProject(rootTestDir);
  });
  after(async () => {
    await deleteTestDirectory(rootTestDir);
  });

  void it('displays, lists and acknowledges notice', async () => {
    const execaOptions = {
      cwd: testProject.projectDirPath,
      env: {
        AMPLIFY_BACKEND_NOTICES_ENDPOINT: betaEndpoint,
      },
    };

    // Prints unacknowledged notice in listing
    let stdout = (await execa('npx', ['ampx', 'notices', 'list'], execaOptions))
      .stdout;
    assert.ok(
      stdout.includes('This is a test notice'),
      `${stdout} must include 'This is a test notice'`
    );

    // Prints unacknowledged notice after random command
    stdout = (await execa('npx', ['ampx', 'info'], execaOptions)).stdout;
    assert.ok(
      stdout.includes('This is a test notice'),
      `${stdout} must include 'This is a test notice'`
    );

    // Acknowledges notice
    stdout = (
      await execa('npx', ['ampx', 'notices', 'acknowledge', '1'], execaOptions)
    ).stdout;
    assert.ok(
      stdout.includes('has been acknowledged'),
      `${stdout} must include 'has been acknowledged'`
    );

    // Assert that acknowledged notices in not included in listing
    stdout = (await execa('npx', ['ampx', 'notices', 'list'], execaOptions))
      .stdout;
    assert.ok(
      !stdout.includes('This is a test notice'),
      `${stdout} must not include 'This is a test notice'`
    );

    // Assert that acknowledged notices in not included after random command
    stdout = (await execa('npx', ['ampx', 'info'], execaOptions)).stdout;
    assert.ok(
      !stdout.includes('This is a test notice'),
      `${stdout} must not include 'This is a test notice'`
    );
  });
});
