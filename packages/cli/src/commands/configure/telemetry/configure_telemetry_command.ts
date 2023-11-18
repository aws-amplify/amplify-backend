import { Printer } from '@aws-amplify/cli-core';
import {
  ConfigurationController,
  USAGE_DATA_TRACKING_ENABLED,
} from '@aws-amplify/platform-core';
import { Argv, CommandModule } from 'yargs';
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
  constructor(private readonly configController: ConfigurationController) {
    this.command = 'telemetry';
    this.describe = 'Configure anonymous usage data collection';
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
      .command('enable', 'Enable anonymous data collection', {}, async () => {
        await this.configController.set(USAGE_DATA_TRACKING_ENABLED, true);

        Printer.print('You have enabled telemetry data collection');
      })
      .command('disable', 'Disable anonymous data collection', {}, async () => {
        await this.configController.set(USAGE_DATA_TRACKING_ENABLED, false);

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
}
