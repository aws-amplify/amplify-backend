import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { Sandbox } from '@aws-amplify/sandbox';
import prompter from 'enquirer';

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
  constructor(private readonly sandbox: Sandbox) {
    this.command = 'delete';
    this.describe = 'Deletes sandbox environment';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<SandboxDeleteCommandOptions>
  ): Promise<void> => {
    let confirm = args.force;
    if (!confirm) {
      const answer = await prompter.prompt<{ result: boolean }>({
        type: 'confirm',
        name: 'result',
        initial: false,
        format: (value) => (value ? 'y' : 'N'),
        message:
          "Are you sure you want to delete all the resources in your sandbox environment (This can't be undone)?",
      });
      confirm = answer.result;
    }

    if (confirm) {
      this.sandbox.delete();
    }
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SandboxDeleteCommandOptions> => {
    return (
      yargs
        .option('force', {
          describe:
            'Do not ask for confirmation before deleting the sandbox environment',
          type: 'boolean',
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
          return true;
        })
    );
  };
}

export type SandboxDeleteCommandOptions = {
  force?: boolean;
};
