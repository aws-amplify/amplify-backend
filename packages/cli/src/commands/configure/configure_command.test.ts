import { afterEach, beforeEach, describe, it } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../test-utils/command_runner.js';
import assert from 'node:assert';
import { ConfigureCommand } from './configure_command.js';
import fs from 'fs/promises';
import path from 'node:path';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader';
import { SharedConfigFiles } from '@aws-sdk/types';
import { Open } from '../open/open.js';

const testAccessKeyId = 'testAccessKeyId';
const testSecretAccessKey = 'testSecretAccessKey';
const testProfile = 'testProfile';
const testRegion = 'mars-east-200';

void describe('configure command', () => {
  const configureCommand = new ConfigureCommand();
  const parser = yargs().command(configureCommand as unknown as CommandModule);

  const commandRunner = new TestCommandRunner(parser);

  let testDir: string;

  const expectedData = `{"configFile":{"${testProfile}":{"region":"${testRegion}"}},"credentialsFile":{"${testProfile}":{"aws_access_key_id":"${testAccessKeyId}","aws_secret_access_key":"${testSecretAccessKey}"}}}`;

  beforeEach(async () => {
    testDir = await fs.mkdtemp('amplify_cmd_test');
    const configFilePath = path.join(process.cwd(), testDir, 'config');
    const credFilePath = path.join(process.cwd(), testDir, 'credentials');

    process.env.AWS_CONFIG_FILE = configFilePath;
    process.env.AWS_SHARED_CREDENTIALS_FILE = credFilePath;
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    delete process.env.AWS_CONFIG_FILE;
    delete process.env.AWS_SHARED_CREDENTIALS_FILE;
  });

  void it('configures a profile with an IAM user', async (contextual) => {
    const mockSecretValue = contextual.mock.method(
      AmplifyPrompter,
      'secretValue',
      (promptMsg: string) => {
        if (promptMsg.includes('Access Key ID')) {
          return Promise.resolve(testAccessKeyId);
        } else if (promptMsg.includes('Secret Access Key')) {
          return Promise.resolve(testSecretAccessKey);
        }
        assert.fail(`Do not expect prompt message: '${promptMsg}'`);
      }
    );

    const mockInput = contextual.mock.method(
      AmplifyPrompter,
      'input',
      (options: { message: string; defaultValue?: string }) => {
        if (options.message.includes('Profile Name')) {
          return Promise.resolve(testProfile);
        } else if (options.message.includes('Enter Region')) {
          return Promise.resolve(testRegion);
        }
        assert.fail(`Do not expect prompt message: '${options.message}'`);
      }
    );

    const mockHasIAMUser = contextual.mock.method(
      AmplifyPrompter,
      'yesOrNo',
      () => Promise.resolve(true)
    );
    await commandRunner.runCommand('configure');

    const data: SharedConfigFiles = await loadSharedConfigFiles({
      ignoreCache: true,
    });

    assert.equal(JSON.stringify(data), expectedData);
    assert.equal(mockSecretValue.mock.callCount(), 2);
    assert.equal(mockInput.mock.callCount(), 2);
    assert.equal(mockHasIAMUser.mock.callCount(), 1);
  });

  void it('configures a profile without an IAM user', async (contextual) => {
    const mockSecretValue = contextual.mock.method(
      AmplifyPrompter,
      'secretValue',
      (promptMsg: string) => {
        if (promptMsg.includes('Access Key ID')) {
          return Promise.resolve(testAccessKeyId);
        } else if (promptMsg.includes('Secret Access Key')) {
          return Promise.resolve(testSecretAccessKey);
        }
        assert.fail(`Do not expect prompt message: '${promptMsg}'`);
      }
    );

    const mockInput = contextual.mock.method(
      AmplifyPrompter,
      'input',
      (options: { message: string; defaultValue?: string }) => {
        if (options.message.includes('[enter] when complete')) {
          return Promise.resolve('anything');
        } else if (options.message.includes('Profile Name')) {
          return Promise.resolve(testProfile);
        } else if (options.message.includes('Enter Region')) {
          return Promise.resolve(testRegion);
        }
        assert.fail(`Do not expect prompt message: '${options.message}'`);
      }
    );

    const mockOpen = contextual.mock.method(Open, 'open', () =>
      Promise.resolve()
    );

    const mockHasIAMUser = contextual.mock.method(
      AmplifyPrompter,
      'yesOrNo',
      () => Promise.resolve(false)
    );
    await commandRunner.runCommand('configure');

    const data: SharedConfigFiles = await loadSharedConfigFiles({
      ignoreCache: true,
    });

    const expectedData = `{"configFile":{"${testProfile}":{"region":"${testRegion}"}},"credentialsFile":{"${testProfile}":{"aws_access_key_id":"${testAccessKeyId}","aws_secret_access_key":"${testSecretAccessKey}"}}}`;

    assert.equal(JSON.stringify(data), expectedData);
    assert.equal(mockSecretValue.mock.callCount(), 2);
    assert.equal(mockInput.mock.callCount(), 3);
    assert.equal(mockHasIAMUser.mock.callCount(), 1);
    assert.equal(mockOpen.mock.callCount(), 1);
    assert.equal(
      mockOpen.mock.calls[0].arguments[0],
      'https://docs.amplify.aws/cli/start/install/'
    );
  });

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('configure --help');
    assert.match(output, /Configure an AWS Amplify profile/);
  });
});
