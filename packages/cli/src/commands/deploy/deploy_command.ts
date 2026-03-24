import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { BackendDeployer } from '@aws-amplify/backend-deployer';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { ArgumentsKebabCase } from '../../kebab_case.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  ClientConfigFormat,
  ClientConfigVersion,
  ClientConfigVersionOption,
  DEFAULT_CLIENT_CONFIG_VERSION,
} from '@aws-amplify/client-config';
import { AmplifyUserError } from '@aws-amplify/platform-core';

export type DeployCommandOptions =
  ArgumentsKebabCase<DeployCommandOptionsCamelCase>;

type DeployCommandOptionsCamelCase = {
  identifier: string;
  outputsFormat: ClientConfigFormat | undefined;
  outputsVersion: string;
  outputsOutDir?: string;
};

/**
 * Deploys Amplify backend resources without Amplify Hosting.
 */
export class DeployCommand
  implements CommandModule<object, DeployCommandOptions>
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
   * Creates the deploy command.
   */
  constructor(
    private readonly clientConfigGenerator: ClientConfigGeneratorAdapter,
    private readonly backendDeployer: BackendDeployer,
  ) {
    this.command = 'deploy';
    this.describe = 'Deploy Amplify backend resources without Amplify Hosting.';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<DeployCommandOptions>,
  ): Promise<void> => {
    const backendId: BackendIdentifier = {
      namespace: args.identifier,
      name: 'default',
      type: 'standalone',
    };

    await this.backendDeployer.deploy(backendId, {
      validateAppSources: true,
    });

    const clientConfigIdentifier = { stackName: args.identifier };

    await this.clientConfigGenerator.generateClientConfigToFile(
      clientConfigIdentifier,
      args.outputsVersion as ClientConfigVersion,
      args.outputsOutDir,
      args.outputsFormat,
    );
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<DeployCommandOptions> => {
    return yargs
      .version(false)
      .option('identifier', {
        describe:
          'Unique identifier for this deployment. Used as the CloudFormation stack name.',
        demandOption: true,
        type: 'string',
        array: false,
      })
      .option('outputs-out-dir', {
        describe:
          'A path to directory where amplify_outputs is written. If not provided defaults to current process working directory.',
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
      })
      .option('outputs-format', {
        describe: 'amplify_outputs file format',
        type: 'string',
        array: false,
        choices: Object.values(ClientConfigFormat),
      })
      .check((argv) => {
        if (argv.identifier.length === 0) {
          throw new AmplifyUserError('InvalidCommandInputError', {
            message: 'Invalid --identifier',
            resolution: '--identifier must be at least 1 character',
          });
        }
        return true;
      });
  };
}
