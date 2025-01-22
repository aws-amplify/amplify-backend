import { Argv, CommandModule } from 'yargs';
import path from 'path';
import { existsSync } from 'fs';
import { execa } from 'execa';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { PackageJsonReader } from '@aws-amplify/platform-core';
import { LocalNamespaceResolver } from '../../../backend-identifier/local_namespace_resolver.js';

/**
 *
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
    const sandboxID = await new SandboxBackendIdResolver(
      new LocalNamespaceResolver(new PackageJsonReader())
    ).resolve();

    //most of this comes from the initial POC for seed, changed filepath to be more inline with discussions that have happened since then
    const seedPath = path.join('seed.ts');
    await execa('tsx', [seedPath], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: {
        AMPLIFY_SANDBOX_IDENTIFIER: JSON.stringify(sandboxID),
      },
    });
  };

  /**
   * @inheritDoc
   */
  //this section also comes from the initial POC for seed
  builder = (yargs: Argv) => {
    return yargs.check(() => {
      //seed path may need to be more flexible or be in a different place
      const seedPath = path.join(process.cwd(), 'seed.ts');
      if (!existsSync(seedPath)) {
        throw new Error(`${seedPath} must exist`);
      }
      return true;
    });
  };
}
