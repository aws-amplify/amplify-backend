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

    const seedPath = path.join('amplify', 'seed.ts');
    await execa('tsx', [seedPath], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: {
        AMPLIFY_SANDBOX_IDENTIFIER: JSON.stringify(sandboxID),
      },
    });

    //eslint-disable-next-line no-console
    console.log(`Seeding is happening...`);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv) => {
    return yargs
      .option('local', {
        type: 'boolean',
      })
      .check(() => {
        const seedPath = path.join(process.cwd(), 'amplify', 'seed.ts');
        if (!existsSync(seedPath)) {
          throw new Error(`${seedPath} must exist`);
        }
        return true;
      });
  };
}
