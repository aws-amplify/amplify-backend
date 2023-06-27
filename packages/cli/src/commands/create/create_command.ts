import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import {
  BackendProjectCreator,
  BackendTemplateGallery,
} from '@aws-amplify/backend-templates';
import * as process from 'process';

export interface CreateCommandOptions {
  template: string;
}

/**
 * A command that scaffolds amplify project.
 * Sample usage: amplify create --template template_name
 */
export class CreateCommand
  implements CommandModule<object, CreateCommandOptions>
{
  readonly command: string;
  readonly describe: string;

  /**
   * Creates a create command instance.
   * @param templateGallery A template gallery. Source of available backend project templates used for building command options choices and validation.
   * @param projectCreator A project creator. Used by command to render a backend project from selected template.
   */
  constructor(
    private readonly templateGallery: BackendTemplateGallery,
    private readonly projectCreator: BackendProjectCreator
  ) {
    this.command = 'create';
    this.describe = 'Creates a new Amplify backend';
  }

  /**
   * Creates a backend project from selected template in a working directory of current process.
   */
  handler = async (
    args: ArgumentsCamelCase<CreateCommandOptions>
  ): Promise<void> => {
    const selectedTemplateName = args.template;
    const destinationDirectory = process.cwd();
    await this.projectCreator.createFromTemplate(
      selectedTemplateName,
      destinationDirectory
    );
    return;
  };

  /**
   * Builds create command definition, i.e. available options and their choices.
   */
  builder = async (yargs: Argv): Promise<Argv<CreateCommandOptions>> => {
    const backendTemplates = await this.templateGallery.listBackendTemplates();
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
