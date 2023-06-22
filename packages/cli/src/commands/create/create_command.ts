import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import {
  createBackendProjectFromTemplate,
  listBackendTemplates,
} from '@aws-amplify/backend-templates';
import * as process from 'process';

interface CreateCommandOptions {
  template: string;
}

/**
 * A command that scaffolds amplify project.
 */
class CreateCommand implements CommandModule<object, CreateCommandOptions> {
  readonly command: string;
  readonly describe: string;

  /**
   * Creates CreateCommand.
   */
  constructor() {
    this.command = 'create';
    this.describe = 'Creates a new Amplify backend';
  }

  handler = async (
    args: ArgumentsCamelCase<CreateCommandOptions>
  ): Promise<void> => {
    const selectedTemplateName = args.template;
    const destinationDirectory = process.cwd();
    await createBackendProjectFromTemplate(
      selectedTemplateName,
      destinationDirectory
    );
    return;
  };

  builder = async (yargs: Argv): Promise<Argv<CreateCommandOptions>> => {
    const backendTemplates = await listBackendTemplates();
    if (backendTemplates.length == 0) {
      throw new Error('No backend template is available');
    }
    const availableTemplateNames = backendTemplates.map(
      (backendTemplate) => backendTemplate.name
    );
    const defaultTemplateName = backendTemplates[0].name;
    return yargs
      .option('template', {
        type: 'string',
        description: 'An application template',
        choices: availableTemplateNames,
        default: defaultTemplateName,
      })
      .showHelpOnFail(false);
  };
}

export const createCommand: CommandModule =
  new CreateCommand() as unknown as CommandModule;
