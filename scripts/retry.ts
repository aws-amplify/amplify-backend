import yargs, { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { execa } from 'execa';

type RetryCommandOptions = {
  command: Array<string>;
  attempts: number;
};

class RetryCommand implements CommandModule<object, RetryCommandOptions> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  constructor() {
    this.command = '$0 [command...]';
    this.describe = 'Executes command with retries';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<RetryCommandOptions>
  ): Promise<void> => {
    const attempts = args.attempts;
    const command = args.command[0];
    const commandArgs = args.command.slice(1);

    for (let attemptNumber = 1; attemptNumber <= attempts; attemptNumber++) {
      try {
        console.log(
          `Attempting ${args.command.join(' ')} ${attemptNumber} time.`
        );
        await execa(command, commandArgs, {
          stdio: 'inherit',
        });
        console.log(
          `Command ${args.command.join(
            ' '
          )} ${attemptNumber} was successful on ${attemptNumber} attempt.`
        );
        return;
      } catch (err) {
        console.log(err);
        console.log(
          `Command ${args.command.join(
            ' '
          )} ${attemptNumber} failed on ${attemptNumber} attempt.`
        );
      }
    }
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<RetryCommandOptions> => {
    return yargs
      .positional('command', {
        type: 'string',
        array: true,
        description: 'the command to execute with retries',
        demandOption: true,
      })
      .option('attempts', {
        type: 'number',
        default: 2,
      });
  };
}

await yargs(hideBin(process.argv)).command(new RetryCommand()).parseAsync();
