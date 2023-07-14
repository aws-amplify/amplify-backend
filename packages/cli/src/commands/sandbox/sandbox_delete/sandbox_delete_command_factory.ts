import { CommandModule } from 'yargs';

import { SandboxDeleteCommand } from './sandbox_delete_command.js';
import { Sandbox } from '@aws-amplify/sandbox';

/**
 * Creates wired sandbox delete command.
 */
export const createSandboxDeleteCommand = (
  sandbox: Sandbox
): CommandModule<object> => {
  return new SandboxDeleteCommand(sandbox);
};
