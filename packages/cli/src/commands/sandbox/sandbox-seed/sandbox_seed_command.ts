import { Argv, CommandModule } from 'yargs';
import path from 'path';
import { existsSync } from 'fs';
import { execa } from 'execa';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { SandboxCommandGlobalOptions } from '../option_types.js';
import { format, printer } from '@aws-amplify/cli-core';

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
    printer.startSpinner('');
    const backendID = await this.backendIDResolver.resolve();
    const seedPath = path.join('amplify', 'seed', 'seed.ts');
    try {
      await execa('tsx', [seedPath], {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: {
          AMPLIFY_BACKEND_IDENTIFIER: JSON.stringify(backendID),
        },
      });
    } catch (err) {
      printer.stopSpinner();
      throw err;
    }
    printer.stopSpinner();
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
