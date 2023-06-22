import { hideBin } from 'yargs/helpers';
import * as process from 'process';
import yargs from 'yargs';
import { createCommand } from './commands/create/create_command.js';

/**
 * CLI Entry Point
 * @param args arguments list. Defaults to process arguments without binary name.
 */
export const main = async (
  args: string[] = hideBin(process.argv)
): Promise<void> => {
  await yargs(args)
    .command(createCommand)
    .help()
    .demandCommand()
    .strictCommands()
    .recommendCommands()
    .parseAsync();
};
