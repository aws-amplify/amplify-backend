import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { BackendIdentifier } from '@aws-amplify/client-config';
import { ClientConfigFormat } from '@aws-amplify/client-config/paths';
import { AppNameResolver } from '../../../local_app_name_resolver.js';
import { ClientConfigGeneratorAdapter } from './client_config_generator_adapter.js';

export type GenerateConfigCommandOptions = {
  stack: string | undefined;
  appId: string | undefined;
  branch: string | undefined;
  format: ClientConfigFormat | undefined;
  out: string | undefined;
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

  private readonly missingArgsError = new Error(
    'Either --stack or --branch must be provided'
  );

  /**
   * Creates client config generation command.
   */
  constructor(
    private readonly clientConfigGenerator: ClientConfigGeneratorAdapter,
    private readonly appNameResolver: AppNameResolver
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
    const backendIdentifier = await this.getBackendIdentifier(args);

    await this.clientConfigGenerator.generateClientConfigToFile(
      backendIdentifier,
      args.out,
      args.format
    );
  };

  /**
   * Translates args to BackendIdentifier.
   * Throws if translation can't be made (this should never happen if command validation works correctly).
   */
  private getBackendIdentifier = async (
    args: ArgumentsCamelCase<GenerateConfigCommandOptions>
  ): Promise<BackendIdentifier> => {
    if (args.stack) {
      return { stackName: args.stack };
    } else if (args.appId && args.branch) {
      return { backendId: args.appId, branchName: args.branch };
    } else if (args.branch) {
      return {
        appName: await this.appNameResolver.resolve(),
        branchName: args.branch,
      };
    }
    throw this.missingArgsError;
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
      .option('out', {
        describe:
          'A path to directory where config is written. If not provided defaults to current process working directory.',
        type: 'string',
        array: false,
      })
      .check((argv) => {
        if (!argv.stack && !argv.branch) {
          throw this.missingArgsError;
        }
        return true;
      });
  };
}
