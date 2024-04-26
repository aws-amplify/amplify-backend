import { beforeEach, describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../test-utils/command_runner.js';
import assert from 'node:assert';
import { ConfigureProfileCommand } from './configure_profile_command.js';
import { AmplifyPrompter, printer } from '@aws-amplify/cli-core';
import { Open } from '../open/open.js';
import { ProfileController } from './profile_controller.js';
import { UsageDataEmitter } from '@aws-amplify/platform-core';

const testAccessKeyId = 'testAccessKeyId';
const testSecretAccessKey = 'testSecretAccessKey';
const testProfile = 'testProfile';
const testRegion = 'testRegion';

const emitFailureMock = mock.fn<UsageDataEmitter['emitFailure']>(() =>
  Promise.resolve()
);
const emitSuccessMock = mock.fn<UsageDataEmitter['emitSuccess']>(() =>
  Promise.resolve()
);

void describe('configure command', () => {
  const profileController = new ProfileController();

  const mockAppendAWSFiles = mock.method(
    profileController,
    'createOrAppendAWSFiles',
    () => Promise.resolve()
  );

  const configureCommand = new ConfigureProfileCommand(profileController);
  const parser = yargs().command(configureCommand as unknown as CommandModule);
  const commandRunner = new TestCommandRunner(parser, {
    emitSuccess: emitSuccessMock,
    emitFailure: emitFailureMock,
  });

  beforeEach(() => {
    mockAppendAWSFiles.mock.resetCalls();
    emitFailureMock.mock.resetCalls();
    emitSuccessMock.mock.resetCalls();
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
    assert.equal(emitFailureMock.mock.callCount(), 0);
    assert.equal(emitSuccessMock.mock.callCount(), 1);
    assert.deepStrictEqual(emitSuccessMock.mock.calls[0].arguments[1], {
      command: 'profile',
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
    assert.equal(emitFailureMock.mock.callCount(), 0);
    assert.equal(emitSuccessMock.mock.callCount(), 1);
    assert.deepStrictEqual(emitSuccessMock.mock.calls[0].arguments[1], {
      command: 'profile',
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
    assert.equal(emitFailureMock.mock.callCount(), 0);
    assert.equal(emitSuccessMock.mock.callCount(), 1);
    assert.deepStrictEqual(emitSuccessMock.mock.calls[0].arguments[1], {
      command: 'profile',
    });
  });

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('profile --help');
    assert.match(output, /Configure an AWS Amplify profile/);
    assert.equal(emitFailureMock.mock.callCount(), 0);
    assert.equal(emitSuccessMock.mock.callCount(), 1);
    assert.deepStrictEqual(emitSuccessMock.mock.calls[0].arguments[1], {
      command: 'profile',
    });
  });
});
