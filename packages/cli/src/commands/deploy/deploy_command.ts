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
import { format, printer } from '@aws-amplify/cli-core';
import { CommandMiddleware } from '../../command_middleware.js';
import {
  GetParameterCommand,
  ParameterNotFound,
  SSMClient,
  SSMServiceException,
} from '@aws-sdk/client-ssm';

export type DeployCommandOptions =
  ArgumentsKebabCase<DeployCommandOptionsCamelCase>;

type DeployCommandOptionsCamelCase = {
  identifier: string;
  profile: string | undefined;
  outputsFormat: ClientConfigFormat | undefined;
  outputsVersion: string;
  outputsOutDir?: string;
};

// CloudFormation stack name constraints
const IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9-]*$/;
const IDENTIFIER_MAX_LENGTH = 128;

// CDK bootstrap version parameter (same as sandbox uses)
const CDK_DEFAULT_BOOTSTRAP_VERSION_PARAMETER_NAME =
  // eslint-disable-next-line spellcheck/spell-checker
  '/cdk-bootstrap/hnb659fds/version';
const CDK_MIN_BOOTSTRAP_VERSION = 6;

const getBootstrapUrl = (region: string) =>
  `https://${region}.console.aws.amazon.com/amplify/create/bootstrap?region=${region}`;

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
    private readonly commandMiddleware: CommandMiddleware,
    private readonly ssmClient: SSMClient,
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

    // Check CDK bootstrap before deploying
    const bootstrapped = await this.isBootstrapped();
    const region = await this.ssmClient.config.region();
    if (!bootstrapped) {
      printer.log(
        `The region ${format.highlight(
          region,
        )} has not been bootstrapped. Sign in to the AWS console as a Root user or Admin to complete the bootstrap process, then re-run the deploy command.`,
      );
      const bootstrapUrl = getBootstrapUrl(region);
      printer.log(`Open ${bootstrapUrl} in the browser.`);
      printer.log(
        format.dim(
          'Note: This check requires ssm:GetParameter permission on /cdk-bootstrap/* resources.',
        ),
      );
      return;
    }

    // Standalone deployments use a single stack per identifier.
    // The 'default' name is a convention: standalone does not have
    // branch-based naming, so a fixed name is used.
    const backendId: BackendIdentifier = {
      namespace: args.identifier,
      name: 'stack',
      type: 'standalone',
    };

    await this.backendDeployer.deploy(backendId, {
      validateAppSources: true,
    });

    // Client config for standalone uses { stackName } instead of
    // { appId, branch } because there is no Amplify Hosting app.
    // This resolves via the StackIdentifier path in deployed-backend-client,
    // which passes stackName directly to CloudFormation APIs like
    // GetTemplateSummary — so it must be the full CFN stack name.
    const stackName = BackendIdentifierConversions.toStackName(backendId);
    const clientConfigIdentifier = { stackName };

    await this.clientConfigGenerator.generateClientConfigToFile(
      clientConfigIdentifier,
      args.outputsVersion as ClientConfigVersion,
      args.outputsOutDir,
      args.outputsFormat,
    );

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
      })
      .option('profile', {
        describe: 'An AWS profile name.',
        type: 'string',
        array: false,
      })
      .middleware([this.commandMiddleware.ensureAwsCredentialAndRegion]);
  };

  /**
   * Checks if a given region has been bootstrapped with >= min version using
   * CDK bootstrap version parameter stored in parameter store.
   */
  private isBootstrapped = async (): Promise<boolean> => {
    try {
      const { Parameter: parameter } = await this.ssmClient.send(
        new GetParameterCommand({
          Name: CDK_DEFAULT_BOOTSTRAP_VERSION_PARAMETER_NAME,
        }),
      );

      const bootstrapVersion = parameter?.Value;
      const versionNumber = Number(bootstrapVersion);
      if (
        !bootstrapVersion ||
        isNaN(versionNumber) ||
        versionNumber < CDK_MIN_BOOTSTRAP_VERSION
      ) {
        return false;
      }
      return true;
    } catch (e) {
      if (e instanceof ParameterNotFound) {
        return false;
      }
      if (
        e instanceof SSMServiceException &&
        [
          'UnrecognizedClientException',
          'AccessDeniedException',
          'NotAuthorized',
          'ExpiredTokenException',
          'ExpiredToken',
          'InvalidSignatureException',
        ].includes(e.name)
      ) {
        throw new AmplifyUserError(
          'SSMCredentialsError',
          {
            message: `${e.name}: ${e.message}`,
            resolution:
              'Make sure your AWS credentials are set up correctly and have permissions to call SSM:GetParameter',
          },
          e,
        );
      }
      throw e;
    }
  };
}
