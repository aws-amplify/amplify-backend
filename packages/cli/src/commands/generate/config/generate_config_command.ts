import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import {
  ClientConfigFormat,
  ClientConfigVersion,
  ClientConfigVersionOption,
  DEFAULT_CLIENT_CONFIG_VERSION,
} from '@aws-amplify/client-config';
import { UsageDataEmitter } from '@aws-amplify/platform-core';
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';
import { ClientConfigGeneratorAdapter } from '../../../client-config/client_config_generator_adapter.js';
import { ArgumentsKebabCase } from '../../../kebab_case.js';

export type GenerateConfigCommandOptions =
  ArgumentsKebabCase<GenerateConfigCommandOptionsCamelCase>;

type GenerateConfigCommandOptionsCamelCase = {
  stack: string | undefined;
  appId: string | undefined;
  branch: string | undefined;
  format: ClientConfigFormat | undefined;
  outDir: string | undefined;
  configVersion: string;
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
    private readonly backendIdentifierResolver: BackendIdentifierResolver,
    private readonly usageDataEmitterCreator: () => Promise<UsageDataEmitter>
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
    const usageDataEmitter = await this.usageDataEmitterCreator();
    const metricDimension = { command: 'amplify generate config' };

    if (!backendIdentifier) {
      throw new Error('Could not resolve the backend identifier');
    }

    await this.clientConfigGenerator
      .generateClientConfigToFile(
        backendIdentifier,
        args.configVersion as ClientConfigVersion,
        args.outDir,
        args.format
      )
      .then(() => usageDataEmitter.emitSuccess({}, metricDimension))
      .catch((error) => usageDataEmitter.emitFailure(error, metricDimension));
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<GenerateConfigCommandOptions> => {
    return yargs
      .option('stack', {
        conflicts: ['app-id', 'branch'],
        describe: 'A stack name that contains an Amplify backend',
        type: 'string',
        array: false,
        group: 'Stack identifier',
      })
      .option('app-id', {
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
      .option('out-dir', {
        describe:
          'A path to directory where config is written. If not provided defaults to current process working directory.',
        type: 'string',
        array: false,
      })
      .option('config-version', {
        describe:
          'Version of the client config. Version 0 represents classic amplify-cli client config amplify-configuration (Default) and 1 represents new unified client config amplify_outputs',
        type: 'string',
        array: false,
        choices: Object.values(ClientConfigVersionOption),
        default: DEFAULT_CLIENT_CONFIG_VERSION,
      });
  };
}
