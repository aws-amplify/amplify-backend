import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { AmplifyPrompter } from '../../prompter/amplify_prompts.js';

/**
 * Command that deletes the sandbox environment.
 */
export class SandboxDeleteCommand
  implements CommandModule<object, SandboxDeleteCommandOptions>
{
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Deletes sandbox environment.
   */
  constructor(private readonly sandboxFactory: SandboxSingletonFactory) {
    this.command = 'delete';
    this.describe = 'Deletes sandbox environment';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<SandboxDeleteCommandOptions>
  ): Promise<void> => {
    let isConfirmed = args.yes;
    if (!isConfirmed) {
      isConfirmed = await AmplifyPrompter.yesOrNo({
        message:
          "Are you sure you want to delete all the resources in your sandbox environment (This can't be undone)?",
      });
    }

    if (isConfirmed) {
      await (
        await this.sandboxFactory.getInstance()
      ).delete({ name: args.name });
    }
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SandboxDeleteCommandOptions> => {
    return (
      yargs
        .option('yes', {
          describe:
            'Do not ask for confirmation before deleting the sandbox environment',
          type: 'boolean',
          array: false,
          alias: 'y',
        })
        .option('name', {
          describe:
            'An optional name to distinguish between different sandbox environments. Default is the name in your package.json',
          type: 'string',
          array: false,
        })
        // kinda hack to "hide" the parent command options from getting displayed in the help
        .option('exclude', {
          hidden: true,
        })
        .option('dirToWatch', {
          hidden: true,
        })
        .check((argv) => {
          if (argv.dirToWatch || argv.exclude) {
            throw new Error(
              `--dirToWatch or --exclude are not valid options for delete`
            );
          }
          if (argv.name) {
            const projectNameRegex = /^[a-zA-Z0-9-]{1,15}$/;
            if (!argv.name.match(projectNameRegex)) {
              throw new Error(
                `--name should match [a-zA-Z0-9-] and less than 15 characters.`
              );
            }
          }
          return true;
        })
    );
  };
}

export type SandboxDeleteCommandOptions = {
  yes?: boolean;
  name?: string;
};
