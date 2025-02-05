import { Argv, CommandModule } from 'yargs';
//import path from 'path';
//import { existsSync } from 'fs';
import { SandboxCommandGlobalOptions } from '../option_types.js';
import { printer } from '@aws-amplify/cli-core';

/**
 *
 */
export class SandboxSeedPolicyCommand implements CommandModule<object> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Seeds sandbox environment.
   */
  constructor() {
    this.command = 'seed policy';
    this.describe = 'Generates policy for seeding based on outputs';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    const policyDocument = '';

    printer.print(policyDocument);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SandboxCommandGlobalOptions> => {
    return yargs;
  };
}
