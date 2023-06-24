import { hideBin } from 'yargs/helpers';
import * as process from 'process';
import yargs, { CommandModule } from 'yargs';
import { CreateCommand } from './commands/create/create_command.js';
import {
  backendProjectCreator,
  backendTemplateGallery,
} from '@aws-amplify/backend-templates';

/**
 * CLI Entry Point
 * @param args arguments list. Defaults to process arguments without binary name.
 */
export const main = async (
  args: string[] = hideBin(process.argv)
): Promise<void> => {
  const createCommand = new CreateCommand(
    backendTemplateGallery,
    backendProjectCreator
  ) as unknown as CommandModule;

  await yargs(args)
    .command(createCommand)
    .help()
    .demandCommand()
    .strictCommands()
    .recommendCommands()
    .parseAsync();
};
