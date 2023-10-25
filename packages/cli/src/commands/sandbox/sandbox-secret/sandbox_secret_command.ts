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
    return (
      yargs
        .command(this.secretSubCommands)
        // Hide inherited options since they are not applicable here.
        .option('dir-to-watch', {
          hidden: true,
        })
        .option('exclude', {
          hidden: true,
        })
        .option('name', {
          hidden: true,
        })
        .option('out', {
          hidden: true,
        })
        .help()
    );
  };
}
