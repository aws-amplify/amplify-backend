import yargs, { Argv } from 'yargs';
import { createGenerateCommand } from './commands/generate/generate_command_factory.js';

/**
 * Creates main parser.
 */
export const createMainParser = (): Argv => {
  return yargs()
    .command(createGenerateCommand())
    .help()
    .demandCommand()
    .strictCommands()
    .recommendCommands();
};
