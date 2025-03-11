import { Argv, CommandModule } from 'yargs';
import { NoticesListCommand } from './notices_list_command.js';
import { NoticesAcknowledgeCommand } from './notices_acknowledge_command.js';

/**
 * Notices command.
 */
export class NoticesCommand implements CommandModule<object> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Creates notices command
   */
  constructor(
    private readonly noticesListCommand: NoticesListCommand,
    private readonly noticesAcknowledgeCommand: NoticesAcknowledgeCommand
  ) {
    this.command = 'notices';
    this.describe = 'Notices';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    // CommandModule requires handler implementation. But this is never called if top level command
    // is configured to require subcommand.
    // Help is printed by default in that case before ever attempting to call handler.
    throw new Error('Top level generate handler should never be called');
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv => {
    return (
      yargs
        .version(false)
        // Cast to erase options types used in internal sub command implementation. Otherwise, compiler fails here.
        .command(this.noticesListCommand as unknown as CommandModule)
        .command(this.noticesAcknowledgeCommand as unknown as CommandModule)
        .demandCommand()
        .strictCommands()
        .recommendCommands()
        .help()
    );
  };
}
