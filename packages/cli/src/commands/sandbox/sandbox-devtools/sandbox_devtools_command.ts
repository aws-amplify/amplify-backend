import { Argv, CommandModule } from 'yargs';
import { LogLevel, printer } from '@aws-amplify/cli-core';

/**
 * Command that starts the sandbox devtools.
 */
export class SandboxDevToolsCommand implements CommandModule<object, object> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Creates sandbox devtools command.
   */
  constructor() {
    this.command = 'devtools';
    this.describe = 'Starts the sandbox devtools UI';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    printer.log('Sandbox DevTools UI is coming soon...', LogLevel.INFO);
    printer.log('This is a placeholder implementation for PR 1', LogLevel.INFO);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv => {
    return yargs.version(false);
  };
}
