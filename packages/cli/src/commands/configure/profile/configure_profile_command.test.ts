import { beforeEach, describe, it, mock } from 'node:test';
import { ConfigureProfileCommand } from './configure_profile_command.js';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { ProfileConfiguration } from '@aws-amplify/configure-profile';

const profileConfiguration = new ProfileConfiguration();
const profileConfigurationOpenDocsMock = mock.method(
  profileConfiguration,
  'openDocs'
);
const profileConfigurationConfigureMock = mock.method(
  profileConfiguration,
  'configure'
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

  void it('generates and writes config for stack', async () => {
    await commandRunner.runCommand('profile');
  });
});
