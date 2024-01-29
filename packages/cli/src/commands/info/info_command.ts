import * as os from 'node:os';
import { Argv, CommandModule } from 'yargs';
import { CdkInfoProvider } from '../../info/cdk_info.js';
import { EnvironmentInfoProvider } from '../../info/env_info.js';
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
    const formattedEnvironmentInfo: string =
      this.environmentInfoProvider.formatEnvInfo(environmentInfo);
    const cdkInfo = await this.cdkInfoProvider.getCdkInfo();
    const formattedCdkInfo: string =
      this.cdkInfoProvider.formatCdkInfo(cdkInfo);
    printer.print(`${formattedEnvironmentInfo}${os.EOL}${formattedCdkInfo}`);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv => {
    return yargs.version(false).help();
  };
}
