import { Argv, CommandModule } from 'yargs';
import { randomBytes } from 'crypto';
import { handleCommandFailure } from '../../../command_failure_handler.js';
import { ConfigController } from './config_controller.js';
import { Printer } from '@aws-amplify/cli-core';

const configureAccountUrl =
  'https://docs.amplify.aws/gen2/start/configure-account';

export const TELEMETRY_ENABLED_KEY = 'telemetry.enabled';
export const TELEMETRY_ANONYMOUS_ID = 'telemetry.anonymousId';
export const TELEMETRY_CONFIG_KEY = 'telemetry';
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
        this.configController.set(TELEMETRY_ENABLED_KEY, 'true');
        this.configController.set(
          TELEMETRY_ANONYMOUS_ID,
          this.getAnonymousId()
        );

        Printer.print('You have enabled telemetry data collection');
      })
      .command('disable', 'Disable anonymous data collection', {}, () => {
        this.configController.set(TELEMETRY_ENABLED_KEY, 'false');

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
