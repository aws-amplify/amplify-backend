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
import { AmplifyUserError } from '@aws-amplify/platform-core';
import {
  BackendOutputClientError,
  BackendOutputClientErrorType,
} from '@aws-amplify/deployed-backend-client';

export type GenerateOutputsCommandOptions =
  ArgumentsKebabCase<GenerateOutputsCommandOptionsCamelCase>;

type GenerateOutputsCommandOptionsCamelCase = {
  stack: string | undefined;
  appId: string | undefined;
  branch: string | undefined;
  format: ClientConfigFormat | undefined;
  outDir: string | undefined;
  outputsVersion: string;
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
    this.describe = 'Generates Amplify backend outputs';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<GenerateOutputsCommandOptions>
  ): Promise<void> => {
    try {
      const backendIdentifier =
        await this.backendIdentifierResolver.resolveDeployedBackendIdentifier(
          args
        );

      if (!backendIdentifier) {
        throw new AmplifyUserError('BackendIdentifierResolverError', {
          message: 'Could not resolve the backend identifier.',
          resolution:
            'Ensure stack name or Amplify App ID and branch specified are correct and exists, then re-run this command.',
        });
      }

      await this.clientConfigGenerator.generateClientConfigToFile(
        backendIdentifier,
        args.outputsVersion as ClientConfigVersion,
        args.outDir,
        args.format
      );
    } catch (error) {
      if (
        error instanceof BackendOutputClientError &&
        error.code === BackendOutputClientErrorType.NO_APP_FOUND_ERROR
      ) {
        throw new AmplifyUserError('AmplifyAppNotFoundError', {
          message: error.message,
          resolution: `Ensure that an Amplify app exists in the region.`,
        });
      }
      // Re-throw any other errors
      throw error;
    }
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
      .option('outputs-version', {
        describe:
          'Version of the configuration. Version 0 represents classic amplify-cli config file amplify-configuration and 1 represents newer config file amplify_outputs',
        type: 'string',
        array: false,
        choices: Object.values(ClientConfigVersionOption),
        default: DEFAULT_CLIENT_CONFIG_VERSION,
      });
  };
}
