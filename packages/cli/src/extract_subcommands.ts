import { Argv } from 'yargs';

/**
 * If the parser finished processing arguments, attempt extracting subcommand information.
 */
export const extractSubCommands = (yargs: Argv): string => {
  return yargs.parsed ? yargs.parsed.argv._.join(' ') : '';
};
