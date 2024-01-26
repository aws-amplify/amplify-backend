import * as os from 'node:os';
import { Argv, CommandModule } from 'yargs';
import {
  formatCdkInfo,
  formatEnvInfo,
  getCdkInfo,
  getEnvInfo,
} from '../../info/index.js';
import { LogLevel, Printer } from '@aws-amplify/cli-core';

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
  constructor() {
    this.command = 'info';
    this.describe = 'Generates information for Amplify troubleshooting';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    const printer = new Printer(LogLevel.INFO);
    const envInfo = await getEnvInfo();
    const formattedEnvInfo: string = formatEnvInfo(envInfo);
    const cdkInfo = await getCdkInfo();
    const formattedCdkInfo: string = formatCdkInfo(cdkInfo);
    printer.print(`${formattedEnvInfo}${os.EOL}${formattedCdkInfo}`);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv => {
    return yargs.version(false).help();
  };
}
