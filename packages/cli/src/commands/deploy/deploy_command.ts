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
import {
  AmplifyUserError,
  BackendIdentifierConversions,
} from '@aws-amplify/platform-core';
import { printer } from '@aws-amplify/cli-core';

export type DeployCommandOptions =
  ArgumentsKebabCase<DeployCommandOptionsCamelCase>;

type DeployCommandOptionsCamelCase = {
  identifier: string;
  outputsFormat: ClientConfigFormat | undefined;
  outputsVersion: string;
  outputsOutDir?: string;
};

// CloudFormation stack name constraints
const IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9-]*$/;
const IDENTIFIER_MAX_LENGTH = 128;

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
    // Validate identifier before deploying
    if (
      !IDENTIFIER_PATTERN.test(args.identifier) ||
      args.identifier.length > IDENTIFIER_MAX_LENGTH
    ) {
      throw new AmplifyUserError('InvalidCommandInputError', {
        message: `Invalid --identifier: "${args.identifier}"`,
        resolution: `--identifier must be 1-${IDENTIFIER_MAX_LENGTH} characters, start with a letter, and contain only alphanumeric characters and hyphens.`,
      });
    }

    // Standalone deployments use a single stack per identifier.
    // The 'default' name is a convention: standalone does not have
    // branch-based naming, so a fixed name is used.
    const backendId: BackendIdentifier = {
      namespace: args.identifier,
      name: 'default',
      type: 'standalone',
    };

    await this.backendDeployer.deploy(backendId, {
      validateAppSources: true,
    });

    // Client config for standalone uses { stackName } instead of
    // { appId, branch } because there is no Amplify Hosting app.
    // This resolves via the StackIdentifier path in deployed-backend-client.
    const clientConfigIdentifier = { stackName: args.identifier };

    await this.clientConfigGenerator.generateClientConfigToFile(
      clientConfigIdentifier,
      args.outputsVersion as ClientConfigVersion,
      args.outputsOutDir,
      args.outputsFormat,
    );

    const stackName = BackendIdentifierConversions.toStackName(backendId);
    printer.log(`Deployment complete.`);
    printer.log(`Stack name: ${stackName}`);
    printer.log(
      `To remove this deployment: aws cloudformation delete-stack --stack-name ${stackName}`,
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
      });
  };
}
