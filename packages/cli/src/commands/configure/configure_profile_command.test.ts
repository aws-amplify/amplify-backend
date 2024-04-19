import { beforeEach, describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../test-utils/command_runner.js';
import assert from 'node:assert';
import { ConfigureProfileCommand } from './configure_profile_command.js';
import { AmplifyPrompter, printer } from '@aws-amplify/cli-core';
import { Open } from '../open/open.js';
import { ProfileController } from './profile_controller.js';
import { UsageDataEmitter } from '@aws-amplify/platform-core';
import { getUsageDataEmitterFactoryMock } from '../../test-utils/mock_usage_data_emitter.js';

const testAccessKeyId = 'testAccessKeyId';
const testSecretAccessKey = 'testSecretAccessKey';
const testProfile = 'testProfile';
const testRegion = 'testRegion';

void describe('configure command', () => {
  const profileController = new ProfileController();

  const mockAppendAWSFiles = mock.method(
    profileController,
    'createOrAppendAWSFiles',
    () => Promise.resolve()
  );

  const emitSuccess = mock.fn<UsageDataEmitter['emitSuccess']>();
  const emitFailure = mock.fn<UsageDataEmitter['emitFailure']>();

  const configureCommand = new ConfigureProfileCommand(
    profileController,
    getUsageDataEmitterFactoryMock(emitSuccess, emitFailure)
  );
  const parser = yargs().command(configureCommand as unknown as CommandModule);

  const commandRunner = new TestCommandRunner(parser);

  beforeEach(() => {
    mockAppendAWSFiles.mock.resetCalls();
    emitSuccess.mock.resetCalls();
    emitFailure.mock.resetCalls();
  });

  void it('configures a profile with an IAM user', async (contextual) => {
    const mockProfileExists = mock.method(
      profileController,
      'profileExists',
      () => Promise.resolve(true)
    );
    const mockPrint = contextual.mock.method(printer, 'print');

    await commandRunner.runCommand(`profile --name ${testProfile}`);

    assert.equal(mockProfileExists.mock.callCount(), 1);
    assert.equal(mockPrint.mock.callCount(), 1);
    assert.match(
      mockPrint.mock.calls[0].arguments[0] as string,
      /already exists!/
    );
    assert.equal(emitSuccess.mock.calls.length, 1);
    assert.deepStrictEqual(emitSuccess.mock.calls[0].arguments[1], {
      command: 'amplify configure profile',
    });
  });

  void it('configures a profile with an IAM user', async (contextual) => {
    const mockProfileExists = mock.method(
      profileController,
      'profileExists',
      () => Promise.resolve(false)
    );
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
        if (options.message.includes('Enter the AWS region to use')) {
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

    await commandRunner.runCommand(`profile --name ${testProfile}`);

    assert.equal(mockProfileExists.mock.callCount(), 1);
    assert.equal(mockSecretValue.mock.callCount(), 2);
    assert.equal(mockInput.mock.callCount(), 1);
    assert.equal(mockHasIAMUser.mock.callCount(), 1);
    assert.equal(mockAppendAWSFiles.mock.callCount(), 1);
    assert.deepStrictEqual(mockAppendAWSFiles.mock.calls[0].arguments[0], {
      profile: testProfile,
      region: testRegion,
      accessKeyId: testAccessKeyId,
      secretAccessKey: testSecretAccessKey,
    });
    assert.equal(emitSuccess.mock.calls.length, 1);
    assert.deepStrictEqual(emitSuccess.mock.calls[0].arguments[1], {
      command: 'amplify configure profile',
    });
  });

  void it('configures a profile without an IAM user', async (contextual) => {
    const mockProfileExists = mock.method(
      profileController,
      'profileExists',
      () => Promise.resolve(false)
    );
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
        } else if (options.message.includes('Enter the AWS region to use')) {
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

    await commandRunner.runCommand(`profile --name ${testProfile}`);

    assert.equal(mockProfileExists.mock.callCount(), 1);
    assert.equal(mockSecretValue.mock.callCount(), 2);
    assert.equal(mockInput.mock.callCount(), 2);
    assert.equal(mockHasIAMUser.mock.callCount(), 1);
    assert.equal(mockOpen.mock.callCount(), 1);
    assert.equal(
      mockOpen.mock.calls[0].arguments[0],
      'https://docs.amplify.aws/gen2/start/account-setup/'
    );
    assert.equal(mockAppendAWSFiles.mock.callCount(), 1);
    assert.deepStrictEqual(mockAppendAWSFiles.mock.calls[0].arguments[0], {
      profile: testProfile,
      region: testRegion,
      accessKeyId: testAccessKeyId,
      secretAccessKey: testSecretAccessKey,
    });
    assert.equal(emitSuccess.mock.calls.length, 1);
    assert.deepStrictEqual(emitSuccess.mock.calls[0].arguments[1], {
      command: 'amplify configure profile',
    });
  });

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('profile --help');
    assert.match(output, /Configure an AWS Amplify profile/);
    assert.equal(emitSuccess.mock.calls.length, 0);
  });
});
