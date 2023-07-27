import { CommandModule } from 'yargs';

import { SandboxCommand, SandboxCommandOptions } from './sandbox_command.js';

/**
 * Creates wired sandbox command.
 */
export const createSandboxCommand = (): CommandModule<
  object,
  SandboxCommandOptions
> => {
  return new SandboxCommand();
};
