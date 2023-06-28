import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';

/**
 * An command that generates client config.
 */
export class GenerateConfigCommand implements CommandModule {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Creates client config generation command.
   */
  constructor() {
    this.command = 'config';
    this.describe = 'Generates client config';
  }

  /**
   * @inheritDoc
   */
  handler(): void | Promise<void> {
    // generate subcommand is required, this is never called.
    throw new Error('Top level generate handler should never be called');
  }

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv => {
    return yargs;
  };
}
