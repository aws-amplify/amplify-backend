import * as path from 'path';
import { format } from '@aws-amplify/cli-core';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { EOL } from 'os';

const expectedCommandName = 'ampx';

/**
 * Verify that the command name is `ampx`.
 * In the next MV, we should remove the "amplify" bin entry entirely and then this validation will no longer be needed
 */
export const verifyCommandName = () => {
  const commandName = path.parse(process.argv[1]).name;
  if (commandName === expectedCommandName) {
    return;
  }
  let command = process.argv.slice(2).join(' ');
  if (command.length === 0) {
    command = '<command>';
  }
  throw new AmplifyUserError('InvalidCommandError', {
    message: `The Amplify Gen 2 CLI has been renamed to ${format.command(
      expectedCommandName
    )}`,
    resolution: `Rerun using the ${format.command(
      expectedCommandName
    )} command name:${EOL}${EOL}${format.normalizeAmpxCommand(command)}${EOL}`,
  });
};
