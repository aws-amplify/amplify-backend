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

  private readonly sandboxSecretSubCommands: CommandModule[];
  /**
   * Root command to manage sandbox secret
   */
  constructor(...subCommands: CommandModule[]) {
    this.command = 'secret <command>';
    this.describe = 'Manage sandbox secret';
    this.sandboxSecretSubCommands = subCommands;
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
        .command(this.sandboxSecretSubCommands)
        // Hide inherited options since they are not applicable here.
        .option('dirToWatch', {
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
