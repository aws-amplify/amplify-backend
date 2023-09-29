import { beforeEach, describe, it, mock } from 'node:test';
import { ConfigureProfileCommand } from './configure_profile_command.js';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../../test-utils/command_runner.js';
import assert from 'node:assert';

void describe('configure profile command', () => {
  const configureProfileCommand = new ConfigureProfileCommand();
  const parser = yargs().command(
    configureProfileCommand as unknown as CommandModule
  );
  const commandRunner = new TestCommandRunner(parser);

  // eslint-disable-next-line
  beforeEach(() => {});

  void it('generates and writes config for stack', async () => {
    await commandRunner.runCommand('profile');
  });
});
