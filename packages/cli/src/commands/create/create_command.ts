import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import {
  backendProjectCreator,
  BackendProjectCreator,
  backendTemplateGallery,
  BackendTemplateGallery,
} from '@aws-amplify/backend-templates';
import * as process from 'process';

interface CreateCommandOptions {
  template: string;
}

/**
 * A command that scaffolds amplify project.
 */
export class CreateCommand
  implements CommandModule<object, CreateCommandOptions>
{
  readonly command: string;
  readonly describe: string;

  /**
   * Creates CreateCommand.
   */
  constructor(
    private readonly templateGallery: BackendTemplateGallery,
    private readonly projectCreator: BackendProjectCreator
  ) {
    this.command = 'create';
    this.describe = 'Creates a new Amplify backend';
  }

  handler = async (
    args: ArgumentsCamelCase<CreateCommandOptions>
  ): Promise<void> => {
    const selectedTemplateName = args.template;
    const destinationDirectory = process.cwd();
    await backendProjectCreator.createFromTemplate(
      selectedTemplateName,
      destinationDirectory
    );
    return;
  };

  builder = async (yargs: Argv): Promise<Argv<CreateCommandOptions>> => {
    const backendTemplates =
      await backendTemplateGallery.listBackendTemplates();
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
