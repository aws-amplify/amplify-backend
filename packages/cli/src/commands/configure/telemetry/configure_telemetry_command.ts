import { Printer } from '@aws-amplify/cli-core';
import {
  ConfigController,
  TELEMETRY_ANONYMOUS_ID,
  TELEMETRY_ENABLED_KEY,
} from '@aws-amplify/platform-core';
import { Argv, CommandModule } from 'yargs';
import { randomBytes } from 'crypto';
import { handleCommandFailure } from '../../../command_failure_handler.js';
/**
 * Command to configure AWS Amplify profile.
 */
export class ConfigureTelemetryCommand implements CommandModule<object> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Configure profile command.
   */
  constructor(private readonly configController: ConfigController) {
    this.command = 'telemetry';
    this.describe = 'Configure telemetry participation';
  }

  /**
   * @inheritDoc
   */
  handler = () => {
    // CommandModule requires handler implementation. But this is never called if top level command
    // is configured to require subcommand.
    // Help is printed by default in that case before ever attempting to call handler.
    throw new Error('Top level generate handler should never be called');
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv) => {
    return yargs
      .command('enable', 'Enable anonymous data collection', {}, () => {
        this.configController.set(TELEMETRY_ENABLED_KEY, true);
        this.configController.set(
          TELEMETRY_ANONYMOUS_ID,
          this.getAnonymousId()
        );

        Printer.print('You have enabled telemetry data collection');
      })
      .command('disable', 'Disable anonymous data collection', {}, () => {
        this.configController.set(TELEMETRY_ENABLED_KEY, false);

        Printer.print('You have disabled telemetry data collection');
      })
      .demandCommand()
      .strictCommands()
      .recommendCommands()
      .fail((msg, err) => {
        handleCommandFailure(msg, err, yargs);
        yargs.exit(1, err);
      });
  };

  /**
   * Generates a random id for telemetry.
   */
  getAnonymousId(): string {
    return randomBytes(32).toString('hex');
  }
}
