import { CommandModule } from 'yargs';

import { SandboxCommand, SandboxCommandOptions } from './sandbox_command.js';
import { createSandboxDeleteCommand } from './sandbox_delete/sandbox_delete_command_factory.js';
import { SandboxDeleteCommand } from './sandbox_delete/sandbox_delete_command.js';
import { sandbox } from '@aws-amplify/sandbox';

/**
 * Creates wired sandbox command.
 */
export const createSandboxCommand = (): CommandModule<
  object,
  SandboxCommandOptions
> => {
  return new SandboxCommand(
    sandbox,
    createSandboxDeleteCommand() as unknown as SandboxDeleteCommand
  );
};
