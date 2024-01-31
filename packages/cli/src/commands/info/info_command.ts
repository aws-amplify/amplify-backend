import * as os from 'node:os';
import { Argv, CommandModule } from 'yargs';
import { CdkInfoProvider } from '../../info/cdk_info_provider.js';
import { EnvironmentInfoProvider } from '../../info/env_info_provider.js';
import { printer } from '../../printer.js';

/**
 * Represents the InfoCommand class.
 */
export class InfoCommand implements CommandModule<object> {
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
  constructor(
    private readonly environmentInfoProvider: EnvironmentInfoProvider,
    private readonly cdkInfoProvider: CdkInfoProvider
  ) {
    this.command = 'info';
    this.describe = 'Generates information for Amplify troubleshooting';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    const environmentInfo = await this.environmentInfoProvider.getEnvInfo();
    const cdkInfo = await this.cdkInfoProvider.getCdkInfo();

    printer.print(`${environmentInfo}${os.EOL}${cdkInfo}`);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv => {
    return yargs.version(false).help();
  };
}
