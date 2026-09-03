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
import { AmplifyPrompter, format, printer } from '@aws-amplify/cli-core';
import { CommandMiddleware } from '../../command_middleware.js';
import { NamespaceResolver } from '../../backend-identifier/local_namespace_resolver.js';
import {
  GetParameterCommand,
  ParameterNotFound,
  SSMClient,
  SSMServiceException,
} from '@aws-sdk/client-ssm';
import path from 'path';
import { execa } from 'execa';

export type DeployCommandOptions =
  ArgumentsKebabCase<DeployCommandOptionsCamelCase>;

type DeployCommandOptionsCamelCase = {
  identifier: string | undefined;
  profile: string | undefined;
  outputsFormat: ClientConfigFormat | undefined;
  outputsVersion: string;
  outputsOutDir?: string;
  backend: boolean;
  frontend: boolean;
  pipeline: boolean;
  yes: boolean | undefined;
};

// CloudFormation stack name constraints
const IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9-]*$/;
const IDENTIFIER_MAX_LENGTH = 128;

/**
 * Sanitize a package.json `name` into a valid deployment identifier: drop an
 * npm scope, replace disallowed characters with hyphens, ensure it starts with
 * a letter, and cap the length. Returns `''` if nothing usable remains.
 */
const sanitizeIdentifier = (name: string): string =>
  name
    .replace(/^@[^/]+\//, '') // drop @scope/
    .replace(/[^A-Za-z0-9-]/g, '-') // only letters, digits + hyphens
    .replace(/^[^A-Za-z]+/, '') // must start with a letter
    .replace(/-+$/, '') // no trailing hyphens
    .slice(0, IDENTIFIER_MAX_LENGTH);

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
export class DeployCommand implements CommandModule<
  object,
  DeployCommandOptions
> {
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
    private readonly namespaceResolver: NamespaceResolver,
    private readonly execaCommand: typeof execa = execa,
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
    // Resolve the deployment identifier (CloudFormation stack name / namespace).
    // Explicit --identifier wins; for non-pipeline deploys we otherwise default
    // to the sanitized package.json `name` (the same source `ampx sandbox` uses),
    // printed so the choice is never silent. (--pipeline supplies stage
    // identifiers itself, so no default is needed there.)
    let resolvedIdentifier = args.identifier;
    if (!args.pipeline && !resolvedIdentifier) {
      resolvedIdentifier = sanitizeIdentifier(
        await this.namespaceResolver.resolve(),
      );
      if (!resolvedIdentifier) {
        throw new AmplifyUserError('InvalidCommandInputError', {
          message:
            'Could not derive a deployment identifier from the package.json "name".',
          resolution:
            'Pass --identifier <name> explicitly. Example: ampx deploy --identifier my-app',
        });
      }
      printer.print(
        `No --identifier provided; using "${resolvedIdentifier}" (from package.json name). Override with --identifier <name>.`,
      );
    }

    // Validate the identifier format (explicit or derived).
    if (
      resolvedIdentifier &&
      (!IDENTIFIER_PATTERN.test(resolvedIdentifier) ||
        resolvedIdentifier.length > IDENTIFIER_MAX_LENGTH)
    ) {
      throw new AmplifyUserError('InvalidCommandInputError', {
        message: `Invalid --identifier: "${resolvedIdentifier}"`,
        resolution: `--identifier must be 1-${IDENTIFIER_MAX_LENGTH} characters, start with a letter, and contain only alphanumeric characters and hyphens.`,
      });
    }

    if (args.backend && args.frontend) {
      throw new AmplifyUserError('InvalidCommandInputError', {
        message: 'Cannot specify both --backend and --frontend flags.',
        resolution:
          'Use one flag to deploy selectively, or omit both to deploy everything.',
      });
    }

    if (args.pipeline && (args.backend || args.frontend)) {
      throw new AmplifyUserError('InvalidCommandInputError', {
        message:
          'Cannot specify --pipeline with --backend or --frontend flags.',
        resolution:
          'Use --pipeline alone to deploy the pipeline stack, or use --backend/--frontend for app deployment.',
      });
    }

    // ampx deploy is a preview feature — confirm before proceeding
    if (!args.yes) {
      const confirmed = await AmplifyPrompter.yesOrNo({
        message:
          '⚠️  ampx deploy is a PREVIEW release — not intended for production use. Do you want to continue?',
      });
      if (!confirmed) {
        printer.log('Deployment canceled.');
        return;
      }
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

    // --pipeline: deploy only the pipeline stack and return early
    if (args.pipeline) {
      const pipelineLocator = new BackendLocator(
        process.cwd(),
        path.join('amplify', 'pipeline'),
      );

      if (!pipelineLocator.exists()) {
        throw new AmplifyUserError('FileConventionError', {
          message: 'Cannot deploy pipeline: no amplify/pipeline.ts found.',
          resolution:
            'Create an amplify/pipeline.ts file that calls definePipeline(), or remove the --pipeline flag.',
        });
      }

      const pipelineEntryPoint = pipelineLocator.locate().replace(/\\/g, '/');
      printer.log(`Deploying pipeline from ${pipelineEntryPoint}...`);

      try {
        // Pipeline deployment bypasses CDK approval because:
        // 1. The user explicitly ran `ampx deploy --pipeline` (intentional action)
        // 2. Pipeline resources are infrastructure-as-code reviewed in the PR
        // 3. The --yes flag already confirmed the user's intent
        await this.execaCommand(
          'npx',
          [
            'cdk',
            'deploy',
            '--app',
            // execa passes this as a single argv element (shell: false), but CDK
            // itself re-executes the --app VALUE through a shell — so the entry
            // path must be quoted here or a path containing spaces or special
            // shell characters is word-split by CDK's shell. Single-quote it
            // (and escape any embedded
            // single quotes) so the path survives CDK's re-parse intact.
            `npx tsx '${pipelineEntryPoint.replace(/'/g, `'\\''`)}'`,
            '--require-approval',
            'never',
            '--all',
          ],
          {
            stdio: 'inherit',
            cwd: process.cwd(),
            shell: false,
          },
        );
      } catch (error) {
        throw new AmplifyUserError(
          'PipelineDeploymentError',
          {
            message: 'Pipeline deployment failed.',
            resolution:
              'Check the CDK deployment output above for details. Ensure your pipeline.ts is valid and AWS credentials are configured.',
          },
          error as Error,
        );
      }

      printer.log(`Pipeline deployment complete.`);
      printer.log('Deployment complete.');
      return;
    }

    const deployBackend = args.backend || (!args.backend && !args.frontend);
    const deployFrontend = args.frontend || (!args.backend && !args.frontend);

    // At this point, identifier is guaranteed to be defined for non-pipeline
    // paths (explicit or derived + validated above).
    const identifier = resolvedIdentifier as string;

    const backendId: BackendIdentifier = {
      namespace: identifier,
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
                  resolution: `Deploy the backend first with: ampx deploy --identifier ${identifier} --backend`,
                },
                error,
              );
            }
            throw error;
          }
        }

        const hostingId: BackendIdentifier = {
          namespace: identifier,
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
        demandOption: false,
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
      .option('pipeline', {
        describe:
          'Deploy only the pipeline stack (amplify/pipeline.ts). Cannot be combined with --backend or --frontend.',
        type: 'boolean',
        default: false,
      })
      .option('yes', {
        describe:
          'Skip the preview confirmation prompt (useful for CI/testing).',
        type: 'boolean',
        array: false,
        alias: 'y',
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
