import { Argv, CommandModule } from 'yargs';

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
    this.describe = 'Manage sandbox secrets';
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
    return yargs.command(this.secretSubCommands).help();
  };
}
