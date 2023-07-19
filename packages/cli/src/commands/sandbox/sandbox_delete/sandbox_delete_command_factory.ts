import { CommandModule } from 'yargs';

import { SandboxDeleteCommand } from './sandbox_delete_command.js';
import { sandbox } from '@aws-amplify/sandbox';

/**
 * Creates wired sandbox delete command.
 */
export const createSandboxDeleteCommand = (): CommandModule<object> => {
  return new SandboxDeleteCommand(sandbox);
};
