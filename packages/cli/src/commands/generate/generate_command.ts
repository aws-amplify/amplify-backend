import { Argv, CommandModule } from 'yargs';
import { GenerateConfigCommand } from './config/generate_config_command.js';

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
  handler = (): void | Promise<void> => {
    // CommandModule requires handler implementation. But this is never called if top level command
    // is configured to require subcommand.
    // Help is printed by default in that case before ever attempting to call handler.
    throw new Error('Top level generate handler should never be called');
  };

  builder = (yargs: Argv): Argv => {
    return (
      yargs
        // Cast to erase options types used in internal sub command implementation. Otherwise, compiler fails here.
        .command(this.generateConfigCommand as unknown as CommandModule)
        .demandCommand()
        .strictCommands()
        .recommendCommands()
    );
  };
}
