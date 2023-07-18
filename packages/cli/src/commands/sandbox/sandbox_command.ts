import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { Sandbox } from '@aws-amplify/sandbox';
import { SandboxDeleteCommand } from './sandbox_delete/sandbox_delete_command.js';
import fs from 'fs';
import { AmplifyPrompter } from '../prompter/amplify_prompts.js';
export type SandboxCommandOptions = {
  dirToWatch: string | undefined;
  exclude: string[] | undefined;
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

  /**
   * Creates sandbox command.
   */
  constructor(
    private readonly sandbox: Sandbox,
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
    process.once('SIGINT', this.sigIntHandler.bind(this));
    await this.sandbox.start(args);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SandboxCommandOptions> => {
    return yargs
      .command(this.sandboxDeleteCommand)
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
        return true;
      });
  };

  sigIntHandler = async () => {
    const answer = await AmplifyPrompter.yesOrNo({
      message:
        'Would you like to delete all the resources in your sandbox environment (This cannot be undone)?',
      defaultValue: false,
    });
    if (answer) await this.sandbox.delete();
  };
}
