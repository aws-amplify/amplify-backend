import { after, before, describe, it } from 'node:test';
import assert from 'assert';
import { MinimalWithTypescriptIdiomTestProjectCreator } from '../test-project-setup/minimal_with_typescript_idioms.js';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../setup_test_directory.js';
import { TestProjectBase } from '../test-project-setup/test_project_base.js';
import { ExecaError, execa } from 'execa';
import { typedConfigurationFileFactory } from '@aws-amplify/platform-core';
import { z } from 'zod';

const betaEndpoint = 'https://beta.notices.cli.amplify.aws/notices.json';

void describe('Notices', { concurrency: false }, () => {
  const projectCreator = new MinimalWithTypescriptIdiomTestProjectCreator();
  let testProject: TestProjectBase;
  const manifestCache = typedConfigurationFileFactory.getInstance(
    'notices_metadata.json',
    z.string(),
    '',
  );
  const metadataFile = typedConfigurationFileFactory.getInstance(
    'notices_acknowledgments.json',
    z.string(),
    '',
  );

  before(async () => {
    await createTestDirectory(rootTestDir);
    testProject = await projectCreator.createProject(rootTestDir);
  });
  after(async () => {
    await deleteTestDirectory(rootTestDir);
  });

  const displaysListsAndAcknowledgesNotice = async () => {
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
      `${stdout} must include 'This is a test notice'`,
    );
    assert.strictEqual(
      stdout.indexOf('https://github.com/aws-amplify/amplify-backend/issues/1'),
      stdout.lastIndexOf(
        'https://github.com/aws-amplify/amplify-backend/issues/1',
      ),
      'Single notice must be shown only once in the output',
    );

    // Prints unacknowledged notice after random command
    stdout = (await execa('npx', ['ampx', 'info'], execaOptions)).stdout;
    assert.ok(
      stdout.includes('This is a test notice'),
      `${stdout} must include 'This is a test notice'`,
    );
    assert.strictEqual(
      stdout.indexOf('https://github.com/aws-amplify/amplify-backend/issues/1'),
      stdout.lastIndexOf(
        'https://github.com/aws-amplify/amplify-backend/issues/1',
      ),
      'Single notice must be shown only once in the output',
    );

    // Acknowledges notice
    stdout = (
      await execa('npx', ['ampx', 'notices', 'acknowledge', '1'], execaOptions)
    ).stdout;
    assert.ok(
      stdout.includes('has been acknowledged'),
      `${stdout} must include 'has been acknowledged'`,
    );

    // Assert that acknowledged notices in not included in listing
    stdout = (await execa('npx', ['ampx', 'notices', 'list'], execaOptions))
      .stdout;
    assert.ok(
      !stdout.includes('This is a test notice'),
      `${stdout} must not include 'This is a test notice'`,
    );

    // Assert that acknowledged notices in not included after random command
    stdout = (await execa('npx', ['ampx', 'info'], execaOptions)).stdout;
    assert.ok(
      !stdout.includes('This is a test notice'),
      `${stdout} must not include 'This is a test notice'`,
    );
  };

  void describe('starting from clean state', () => {
    before(async () => {
      await manifestCache.delete();
      await metadataFile.delete();
    });
    void it(
      'displays, lists and acknowledges notice',
      displaysListsAndAcknowledgesNotice,
    );
  });

  void describe('starting from broken local files', () => {
    before(async () => {
      await manifestCache.write('broken manifest cache');
      await metadataFile.write('broken acknowledgement file');
    });
    void it(
      'displays, lists and acknowledges notice',
      displaysListsAndAcknowledgesNotice,
    );
  });

  void describe('when notices website is broken', () => {
    let execaOptionWithBadEndpoint = {};
    before(async () => {
      await manifestCache.delete();
      await metadataFile.delete();
      execaOptionWithBadEndpoint = {
        cwd: testProject.projectDirPath,
        env: {
          AMPLIFY_BACKEND_NOTICES_ENDPOINT:
            'https://beta.notices.cli.amplify.aws/does_not_exist.json',
        },
      };
    });

    void it('does not crash non-notices commands', async () => {
      // Executes successfully and does not print notices.
      const stdout = (
        await execa('npx', ['ampx', 'info'], execaOptionWithBadEndpoint)
      ).stdout;
      assert.ok(
        !stdout.includes('This is a test notice'),
        `${stdout} must not include 'This is a test notice'`,
      );
    });

    void it('prints error when listing notices', async () => {
      await assert.rejects(
        () =>
          execa('npx', ['ampx', 'notices', 'list'], execaOptionWithBadEndpoint),
        (error: ExecaError) => {
          assert.ok(
            typeof error.stdout === 'string' &&
              error.stdout.includes('NoticeManifestFetchFault'),
          );
          return true;
        },
      );
    });
  });
});
