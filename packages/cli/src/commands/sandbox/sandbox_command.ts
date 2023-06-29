import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { Sandbox } from '@aws-amplify/sandbox';
import fs from 'fs';
export type SandboxCommandOptions = {
  dir: string | undefined;
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
  constructor() {
    this.command = 'sandbox';
    this.describe = 'Starts sandbox, watch mode for amplify deployments';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<SandboxCommandOptions>
  ): Promise<void> => {
    await new Sandbox({ dir: args.dir, exclude: args.exclude }).start();
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SandboxCommandOptions> => {
    return yargs
      .option('dir', {
        describe:
          'Directory to watch, all subdirectories will be included. Defaults to current dir',
        type: 'string',
        array: false,
      })
      .option('exclude', {
        describe: 'List of files or directories to exclude from watching.',
        type: 'string',
        array: true,
      })
      .check((argv) => {
        if (argv.dir) {
          // make sure it's a real directory
          let stats;
          try {
            stats = fs.statSync(argv.dir, {});
          } catch (e) {
            throw new Error(`--dir ${argv.dir} does not exist`);
          }
          if (!stats.isDirectory()) {
            throw new Error(`--dir ${argv.dir} is not a valid directory`);
          }
        }
        return true;
      });
  };
}
