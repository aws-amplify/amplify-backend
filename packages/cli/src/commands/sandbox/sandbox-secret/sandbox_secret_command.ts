import { Argv, CommandModule } from 'yargs';
import { handleCommandFailure } from '../../../command_failure_handler.js';

/**
 * Root command to manage sandbox secret.
 */
export class SandboxSecretCommand implements CommandModule<object> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Root command to manage sandbox secret
   */
  constructor(private readonly secretSubCommands: CommandModule[]) {
    this.command = 'secret <command>';
    this.describe = 'Manage sandbox secret';
  }

  /**
   * @inheritDoc
   */
  handler = (): void => {
    // no-op for non-terminal command.
    return;
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv => {
    return yargs
      .command(this.secretSubCommands)
      .help()
      .fail((msg, err) => {
        handleCommandFailure(msg, err, yargs);
        yargs.exit(1, err);
      });
  };
}
