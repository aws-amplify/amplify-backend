import { beforeEach, describe, it, mock } from 'node:test';
import { ConfigureProfileCommand } from './configure_profile_command.js';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import {
  ProfileConfiguration,
  ProfileSettings,
} from '@aws-amplify/configure-profile';
import { AmplifyPrompter, ValidateFn } from '../../prompter/amplify_prompts.js';

const profileConfiguration = new ProfileConfiguration();
const profileConfigurationOpenDocsMock = mock.method(
  profileConfiguration,
  'openDocs',
  () => {
    return Promise.resolve();
  }
);
const profileConfigurationConfigureMock = mock.method(
  profileConfiguration,
  'configure',
  (profileSettings: ProfileSettings) => {
    return Promise.resolve(profileSettings);
  }
);

void describe('configure profile command', () => {
  const configureProfileCommand = new ConfigureProfileCommand(
    profileConfiguration
  );
  const parser = yargs().command(
    configureProfileCommand as unknown as CommandModule
  );
  const commandRunner = new TestCommandRunner(parser);

  // eslint-disable-next-line
  beforeEach(() => {
    profileConfigurationOpenDocsMock.mock.resetCalls();
    profileConfigurationConfigureMock.mock.resetCalls();
  });

  void it('configures local AWS profile', async (contextual) => {
    // User inputted accessKeyId & secretAccessKey
    contextual.mock.method(
      AmplifyPrompter,
      'secretValue',
      (promptMessage: string) => Promise.resolve(promptMessage)
    );
    // User inputted region
    contextual.mock.method(AmplifyPrompter, 'select', () =>
      Promise.resolve('us-west-2')
    );

    await commandRunner.runCommand('profile');
    assert.equal(profileConfigurationOpenDocsMock.mock.callCount(), 1);
    assert.equal(profileConfigurationConfigureMock.mock.callCount(), 1);
    assert.deepEqual(
      profileConfigurationConfigureMock.mock.calls[0].arguments,
      [
        {
          accessKeyId: 'accessKeyId',
          secretAccessKey: 'secretAccessKey',
          region: 'us-west-2',
        },
      ]
    );
  });
});
