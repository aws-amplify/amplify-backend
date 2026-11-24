import { Argv } from 'yargs';
import { resolveKnownCommand } from './known_commands.js';

/**
 * If the parser finished processing arguments, attempt extracting subcommand information.
 *
 * Only known command names are included; unrecognized arguments are recorded as a placeholder.
 */
export const extractSubCommands = (yargs: Argv): string | undefined => {
  return yargs.parsed
    ? resolveKnownCommand(yargs.parsed.argv._).path.join(' ')
    : undefined;
};
