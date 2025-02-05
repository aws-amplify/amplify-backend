import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import path from 'path';
import { existsSync } from 'fs';
import { execa } from 'execa';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import {
  AmplifyUserError,
  PackageJsonReader,
} from '@aws-amplify/platform-core';
import { LocalNamespaceResolver } from '../../../backend-identifier/local_namespace_resolver.js';
import { STSClient } from '@aws-sdk/client-sts';
import { ArgumentsKebabCase } from '../../../kebab_case.js';
import { SandboxCommandGlobalOptions } from '../option_types.js';

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
  constructor(private readonly stsClient = new STSClient()) {
    this.command = 'seed';
    this.describe = 'Seeds sandbox environment';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<SandboxSeedCommandOptionsKebabCase>
  ): Promise<void> => {
    const backendID = await new SandboxBackendIdResolver(
      new LocalNamespaceResolver(new PackageJsonReader())
    ).resolve();

    const profile = args.profile;
    if (profile) {
      const seedPath = path.join('seed.ts');
      await execa('tsx', [seedPath], {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: {
          AMPLIFY_SANDBOX_IDENTIFIER: JSON.stringify(backendID),
        },
      });
    }
    //most of this comes from the initial POC for seed, changed filepath to be more inline with discussions that have happened since then
    const seedPath = path.join('seed.ts');
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
  builder = (yargs: Argv) => {
    return yargs
      .option('role-name', {
        describe: 'Name of role that has permissions for seeding',
        string: true,
        global: false,
      })
      .check(() => {
        //TO DO: seed path may need to be more flexible or be in a different place -- or name may need to change
        const seedPath = path.join(process.cwd(), 'seed.ts');
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

type SandboxSeedCommandOptionsKebabCase = ArgumentsKebabCase<
  {
    roleName?: string;
  } & SandboxCommandGlobalOptions
>;
