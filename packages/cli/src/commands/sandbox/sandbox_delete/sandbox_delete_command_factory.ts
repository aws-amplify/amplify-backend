import { CommandModule } from 'yargs';

import { SandboxDeleteCommand } from './sandbox_delete_command.js';

/**
 * Creates wired sandbox delete command.
 */
export const createSandboxDeleteCommand = (): CommandModule<object> => {
  return new SandboxDeleteCommand();
};
