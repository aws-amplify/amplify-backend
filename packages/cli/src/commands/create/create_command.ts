import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { listBackendTemplates } from '@aws-amplify/backend-templates';

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
    const backendTemplates = listBackendTemplates();
    const selectedTemplate = backendTemplates.find(
      (template) => template.name === selectedTemplateName
    );
    console.log(selectedTemplate);
    return;
  };

  builder = (yargs: Argv): Argv<CreateCommandOptions> => {
    const backendTemplates = listBackendTemplates();
    if (backendTemplates.length == 0) {
      throw new Error('No backend template is available');
    }
    const availableTemplateNames = backendTemplates.map(
      (backendTemplate) => backendTemplate.name
    );
    const defaultTemplateName = backendTemplates[0].name;
    return yargs.option('template', {
      type: 'string',
      description: 'An application template',
      choices: availableTemplateNames,
      default: defaultTemplateName,
    });
  };
}

export const createCommand: CommandModule =
  new CreateCommand() as unknown as CommandModule;
