import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { GenerateConfigCommand } from './generate_config_command.js';

/**
 * An entry point for generate command.
 */
export class GenerateCommand implements CommandModule {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Creates top level entry point for generate command.
   */
  constructor(private readonly generateConfigCommand: GenerateConfigCommand) {
    this.command = 'generate';
    this.describe = 'Generates post deployment artifacts';
  }

  /**
   * @inheritDoc
   */
  handler(): void | Promise<void> {
    // generate subcommand is required, this is never called.
    throw new Error('Top level generate handler should never be called');
  }

  builder = (yargs: Argv): Argv => {
    return yargs
      .command(this.generateConfigCommand)
      .demandCommand()
      .strictCommands()
      .recommendCommands();
  };
}
