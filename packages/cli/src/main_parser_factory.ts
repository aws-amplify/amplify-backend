import yargs, { Argv, CommandModule } from 'yargs';
import { CreateCommand } from './commands/create/create_command.js';
import {
  backendProjectCreator,
  backendTemplateGallery,
} from '@aws-amplify/backend-templates';

/**
 * Creates main parser.
 */
export const createMainParser = (): Argv => {
  const createCommand = new CreateCommand(
    backendTemplateGallery,
    backendProjectCreator
  ) as unknown as CommandModule;

  return yargs()
    .command(createCommand)
    .help()
    .demandCommand()
    .strictCommands()
    .recommendCommands();
};
