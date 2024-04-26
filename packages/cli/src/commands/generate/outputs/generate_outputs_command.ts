import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import {
  ClientConfigFormat,
  ClientConfigVersion,
  ClientConfigVersionOption,
  DEFAULT_CLIENT_CONFIG_VERSION,
} from '@aws-amplify/client-config';
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';
import { ClientConfigGeneratorAdapter } from '../../../client-config/client_config_generator_adapter.js';
import { ArgumentsKebabCase } from '../../../kebab_case.js';

export type GenerateOutputsCommandOptions =
  ArgumentsKebabCase<GenerateOutputsCommandOptionsCamelCase>;

type GenerateOutputsCommandOptionsCamelCase = {
  stack: string | undefined;
  appId: string | undefined;
  branch: string | undefined;
  format: ClientConfigFormat | undefined;
  outDir: string | undefined;
  configVersion: string;
};

/**
 * Command that generates client config aka amplify_outputs.
 */
export class GenerateOutputsCommand
  implements CommandModule<object, GenerateOutputsCommandOptions>
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
   * Creates client config (amplify-outputs.json) generation command.
   */
  constructor(
    private readonly clientConfigGenerator: ClientConfigGeneratorAdapter,
    private readonly backendIdentifierResolver: BackendIdentifierResolver
  ) {
    this.command = 'outputs';
    this.describe = 'Generates amplify outputs';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<GenerateOutputsCommandOptions>
  ): Promise<void> => {
    const backendIdentifier = await this.backendIdentifierResolver.resolve(
      args
    );

    if (!backendIdentifier) {
      throw new Error('Could not resolve the backend identifier');
    }

    await this.clientConfigGenerator.generateClientConfigToFile(
      backendIdentifier,
      args.configVersion as ClientConfigVersion,
      args.outDir,
      args.format
    );
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<GenerateOutputsCommandOptions> => {
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
          'Version of the configuration. Version 0 represents classic amplify-cli config file amplify-configuration and 1 represents newer config file amplify_outputs',
        type: 'string',
        array: false,
        choices: Object.values(ClientConfigVersionOption),
        default: DEFAULT_CLIENT_CONFIG_VERSION,
      });
  };
}
