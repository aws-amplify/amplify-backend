import { Argv, CommandModule } from 'yargs';
import path from 'path';
import { existsSync } from 'fs';
import { execa } from 'execa';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import {
  AmplifyUserError,
  PackageJsonReader,
} from '@aws-amplify/platform-core';
import { LocalNamespaceResolver } from '../../../backend-identifier/local_namespace_resolver.js';
import { SandboxCommandGlobalOptions } from '../option_types.js';

/**
 * Command that runs seed in sandbox environment
 */
export class SandboxSeedCommand implements CommandModule<object> {
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
    this.command = 'seed';
    this.describe = 'Seeds sandbox environment';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    const backendID = await new SandboxBackendIdResolver(
      new LocalNamespaceResolver(new PackageJsonReader())
    ).resolve();
    const seedPath = path.join('amplify', 'seed', 'seed.ts');
    await execa('tsx', [seedPath], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: {
        AMPLIFY_SANDBOX_IDENTIFIER: JSON.stringify(backendID),
      },
    });
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SandboxCommandGlobalOptions> => {
    return yargs.check(() => {
      const seedPath = path.join(process.cwd(), 'amplify', 'seed', 'seed.ts');
      if (!existsSync(seedPath)) {
        throw new AmplifyUserError('SeedScriptNotFoundError', {
          message: `There is no file that corresponds to ${seedPath}`,
          resolution: `Please make a file that corresponds to ${seedPath} and put your seed logic in it`,
        });
      }
      return true;
    });
  };
}
