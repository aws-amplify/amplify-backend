import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
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
  BackendLocator,
} from '@aws-amplify/platform-core';
import { format, printer } from '@aws-amplify/cli-core';
import { CommandMiddleware } from '../../command_middleware.js';
import {
  GetParameterCommand,
  ParameterNotFound,
  SSMClient,
  SSMServiceException,
} from '@aws-sdk/client-ssm';
import path from 'path';

export type DeployCommandOptions =
  ArgumentsKebabCase<DeployCommandOptionsCamelCase>;

type DeployCommandOptionsCamelCase = {
  identifier: string;
  profile: string | undefined;
  outputsFormat: ClientConfigFormat | undefined;
  outputsVersion: string;
  outputsOutDir?: string;
  backend: boolean;
  frontend: boolean;
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
    private readonly backendDeployerFactory: BackendDeployerFactory,
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

    const deployBackend = args.backend || (!args.backend && !args.frontend);
    const deployFrontend = args.frontend || (!args.backend && !args.frontend);

    const backendId: BackendIdentifier = {
      namespace: args.identifier,
      name: 'backend',
      type: 'standalone',
    };

    if (deployBackend) {
      const backendDeployer = this.backendDeployerFactory.getInstance();
      await backendDeployer.deploy(backendId, {
        validateAppSources: true,
      });

      const backendStackName =
        BackendIdentifierConversions.toStackName(backendId);
      await this.clientConfigGenerator.generateClientConfigToFile(
        { stackName: backendStackName },
        args.outputsVersion as ClientConfigVersion,
        args.outputsOutDir,
        args.outputsFormat,
      );
      printer.log(`Backend deployment complete.`);
      printer.log(`Backend stack: ${backendStackName}`);
    }

    if (deployFrontend) {
      const hostingLocator = new BackendLocator(
        process.cwd(),
        path.join('amplify', 'hosting'),
      );

      if (!hostingLocator.exists()) {
        // If user explicitly asked for --frontend, throw an error
        if (args.frontend) {
          throw new AmplifyUserError('FileConventionError', {
            message: 'Cannot deploy frontend: no amplify/hosting.ts found.',
            resolution:
              'Create an amplify/hosting.ts file that calls defineHosting(), or remove the --frontend flag.',
          });
        }
        // Bare deploy without hosting.ts → skip frontend silently
      } else {
        // Hosting file exists — deploy it
        if (!deployBackend) {
          // --frontend only: generate client config from existing backend stack
          const backendStackName =
            BackendIdentifierConversions.toStackName(backendId);
          try {
            await this.clientConfigGenerator.generateClientConfigToFile(
              { stackName: backendStackName },
              args.outputsVersion as ClientConfigVersion,
              args.outputsOutDir,
              args.outputsFormat,
            );
          } catch (error) {
            // Only treat stack-not-found errors as "backend not deployed".
            // Re-throw credential errors, network errors, etc. as-is.
            if (
              error instanceof Error &&
              error.message.includes('does not exist')
            ) {
              throw new AmplifyUserError(
                'BackendNotDeployedError',
                {
                  message: `Backend has not been deployed yet. Run 'ampx deploy --backend' first, or run 'ampx deploy' without flags to deploy everything.`,
                  resolution: `Deploy the backend first with: ampx deploy --identifier ${args.identifier} --backend`,
                },
                error,
              );
            }
            throw error;
          }
        }

        const hostingId: BackendIdentifier = {
          namespace: args.identifier,
          name: 'hosting',
          type: 'standalone',
        };
        const hostingDeployer =
          this.backendDeployerFactory.getInstance(hostingLocator);
        await hostingDeployer.deploy(hostingId, {
          validateAppSources: true,
        });

        const hostingStackName =
          BackendIdentifierConversions.toStackName(hostingId);
        printer.log(`Frontend deployment complete.`);
        printer.log(`Frontend stack: ${hostingStackName}`);
      }
    }

    printer.log('Deployment complete.');
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
      .option('backend', {
        describe:
          'Deploy only backend resources (auth, data, storage). Skips hosting.',
        type: 'boolean',
        default: false,
      })
      .option('frontend', {
        describe:
          'Deploy only hosting resources. Requires backend to be deployed first.',
        type: 'boolean',
        default: false,
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
