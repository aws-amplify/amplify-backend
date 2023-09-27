import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { ClientConfigFormat } from '@aws-amplify/client-config';
import { ClientConfigGeneratorAdapter } from './client_config_generator_adapter.js';
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';

export type GenerateConfigCommandOptions = {
  stack: string | undefined;
  appId: string | undefined;
  branch: string | undefined;
  format: ClientConfigFormat | undefined;
  outDir: string | undefined;
};

/**
 * Command that generates client config.
 */
export class GenerateConfigCommand
  implements CommandModule<object, GenerateConfigCommandOptions>
{
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Creates client config generation command.
   */
  constructor(
    private readonly clientConfigGenerator: ClientConfigGeneratorAdapter,
    private readonly backendIdentifierResolver: BackendIdentifierResolver
  ) {
    this.command = 'config';
    this.describe = 'Generates client config';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<GenerateConfigCommandOptions>
  ): Promise<void> => {
    const backendIdentifier = await this.backendIdentifierResolver.resolve(
      args
    );

    await this.clientConfigGenerator.generateClientConfigToFile(
      backendIdentifier,
      args.outDir,
      args.format
    );
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<GenerateConfigCommandOptions> => {
    return yargs
      .option('stack', {
        conflicts: ['appId', 'branch'],
        describe: 'A stack name that contains an Amplify backend',
        type: 'string',
        array: false,
        group: 'Stack identifier',
      })
      .option('appId', {
        conflicts: ['stack'],
        describe: 'The Amplify App ID of the project',
        type: 'string',
        array: false,
        implies: 'branch',
        group: 'Project identifier',
      })
      .option('branch', {
        conflicts: ['stack'],
        describe: 'A git branch of the Amplify project',
        type: 'string',
        array: false,
        group: 'Project identifier',
      })
      .option('format', {
        describe: 'The format which the configuration should be exported into.',
        type: 'string',
        array: false,
        choices: Object.values(ClientConfigFormat),
      })
      .option('outDir', {
        describe:
          'A path to directory where config is written. If not provided defaults to current process working directory.',
        type: 'string',
        array: false,
      })
      .check((argv) => {
        if (!argv.stack && !argv.branch) {
          throw new Error('Either --stack or --branch must be provided');
        }
        return true;
      });
  };
}
