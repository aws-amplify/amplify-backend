import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { SandboxDeleteCommand } from './sandbox-delete/sandbox_delete_command.js';
import fs from 'fs';
import { AmplifyPrompter } from '../prompter/amplify_prompts.js';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';

export const formatChoices = ['js', 'json', 'ts'] as const;

export type SandboxCommandOptions = {
  dirToWatch: string | undefined;
  exclude: string[] | undefined;
  name: string | undefined;
  format: (typeof formatChoices)[number] | undefined;
  out: string | undefined;
};

/**
 * Command that starts sandbox.
 */
export class SandboxCommand
  implements CommandModule<object, SandboxCommandOptions>
{
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  private appName?: string;

  /**
   * Creates sandbox command.
   */
  constructor(
    private readonly sandboxFactory: SandboxSingletonFactory,
    private readonly sandboxDeleteCommand: SandboxDeleteCommand
  ) {
    this.command = 'sandbox';
    this.describe = 'Starts sandbox, watch mode for amplify deployments';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<SandboxCommandOptions>
  ): Promise<void> => {
    this.appName = args.name;
    await (
      await this.sandboxFactory.getInstance()
    ).start({
      dir: args.dirToWatch,
      exclude: args.exclude,
      name: args.name,
      clientConfigFilePath: args.out,
    });
    process.once('SIGINT', () => void this.sigIntHandler());
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SandboxCommandOptions> => {
    return (
      yargs
        // Cast to erase options types used in internal sub command implementation. Otherwise, compiler fails here.
        .command(this.sandboxDeleteCommand as unknown as CommandModule)
        .option('dirToWatch', {
          describe:
            'Directory to watch for file changes. All subdirectories and files will be included. defaults to the current directory.',
          type: 'string',
          array: false,
        })
        .option('exclude', {
          describe:
            'An array of paths or glob patterns to ignore. Paths can be relative or absolute and can either be files or directories',
          type: 'string',
          array: true,
        })
        .option('name', {
          describe:
            'An optional name to distinguish between different sandbox environments. Default is the name in your package.json',
          type: 'string',
          array: false,
        })
        .option('format', {
          describe:
            'The format which the configuration should be exported into.',
          type: 'string',
          array: false,
          choices: formatChoices,
        })
        .option('out', {
          describe:
            'A path to directory where config is written. If not provided defaults to current process working directory.',
          type: 'string',
          array: false,
        })
        .check((argv) => {
          if (argv.dirToWatch) {
            // make sure it's a real directory
            let stats;
            try {
              stats = fs.statSync(argv.dirToWatch, {});
            } catch (e) {
              throw new Error(`--dirToWatch ${argv.dirToWatch} does not exist`);
            }
            if (!stats.isDirectory()) {
              throw new Error(
                `--dirToWatch ${argv.dirToWatch} is not a valid directory`
              );
            }
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

  sigIntHandler = async () => {
    const answer = await AmplifyPrompter.yesOrNo({
      message:
        'Would you like to delete all the resources in your sandbox environment (This cannot be undone)?',
      defaultValue: false,
    });
    if (answer)
      await (
        await this.sandboxFactory.getInstance()
      ).delete({ name: this.appName });
  };
}
