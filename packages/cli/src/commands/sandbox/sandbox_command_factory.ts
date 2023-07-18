import { CommandModule } from 'yargs';

import { SandboxCommand, SandboxCommandOptions } from './sandbox_command.js';
import { createSandboxDeleteCommand } from './sandbox_delete/sandbox_delete_command_factory.js';
import { SandboxDeleteCommand } from './sandbox_delete/sandbox_delete_command.js';
import { Sandbox } from '@aws-amplify/sandbox';

/**
 * Creates wired sandbox command.
 */
export const createSandboxCommand = (): CommandModule<
  object,
  SandboxCommandOptions
> => {
  const sandboxInstance = new Sandbox();
  return new SandboxCommand(
    sandboxInstance,
    createSandboxDeleteCommand(
      sandboxInstance
    ) as unknown as SandboxDeleteCommand
  );
};
