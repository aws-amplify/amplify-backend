import { Argv, CommandModule } from 'yargs';
import path from 'path';
import { existsSync } from 'fs';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { AmplifyError, AmplifyUserError } from '@aws-amplify/platform-core';
import { SandboxCommandGlobalOptions } from '../option_types.js';
import { format, printer } from '@aws-amplify/cli-core';
import { tsImport } from 'tsx/esm/api';
import { pathToFileURL } from 'url';

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
  constructor(
    private readonly backendIDResolver: SandboxBackendIdResolver,
    private readonly seedSubCommands: CommandModule[],
  ) {
    this.command = 'seed';
    this.describe = 'Seeds sandbox environment';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    printer.print(`${format.color('seed is running...', 'Blue')}`);
    const backendID = await this.backendIDResolver.resolve();
    const seedPath = path.join('amplify', 'seed', 'seed.ts');
    process.env.AMPLIFY_BACKEND_IDENTIFIER = JSON.stringify(backendID);
    try {
      await tsImport(pathToFileURL(seedPath).toString(), import.meta.url);
    } catch (e) {
      const error = e as Error;
      if (
        error.message.includes('Cannot find module') &&
        error.message.includes('seed')
      ) {
        throw new AmplifyUserError(
          'SeedScriptNotFoundError',
          {
            message: `There is no file that corresponds to ${seedPath}`,
            resolution: `Please make a file that corresponds to ${seedPath} and put your seed logic in it`,
          },
          error,
        );
      } else {
        if (AmplifyError.isAmplifyError(e)) {
          throw e;
        }
        throw new AmplifyUserError(
          'SeedingFailedError',
          {
            message: 'Seed failed to complete',
            resolution:
              'Check the Caused by error and fix any issues in your seed script',
          },
          e instanceof Error ? error : undefined,
        );
      }
    }

    printer.printNewLine();
    printer.print(`${format.success('✔')} seed has successfully completed`);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SandboxCommandGlobalOptions> => {
    return yargs.command(this.seedSubCommands).check(() => {
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
