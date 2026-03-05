import _isCI from 'is-ci';
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
import { format } from '@aws-amplify/cli-core';
import { FrontendDeployer } from './frontend_deployer.js';
import { PipelineStackDeployer } from './pipeline_stack_deployer.js';

export type PipelineDeployCommandOptions =
  ArgumentsKebabCase<PipelineDeployCommandOptionsCamelCase>;

type PipelineDeployCommandOptionsCamelCase = {
  branch?: string;
  appId?: string;
  infrastructure?: boolean;
  pipeline?: boolean;
  outputsFormat: ClientConfigFormat | undefined;
  outputsVersion: string;
  outputsOutDir?: string;
};

/**
 * An entry point for deploy command.
 */
export class PipelineDeployCommand
  implements CommandModule<object, PipelineDeployCommandOptions>
{
  /** @inheritDoc */
  readonly command: string;
  /** @inheritDoc */
  readonly describe: string;

  /** Creates top level entry point for deploy command. */
  constructor(
    private readonly clientConfigGenerator: ClientConfigGeneratorAdapter,
    private readonly backendDeployer: BackendDeployer,
    private readonly isCiEnvironment: typeof _isCI = _isCI,
  ) {
    this.command = 'pipeline-deploy';
    this.describe =
      'Command to deploy backends in a custom CI/CD pipeline. This command is not intended to be used locally.';
  }

  handler = async (
    args: ArgumentsCamelCase<PipelineDeployCommandOptions>,
  ): Promise<void> => {
    // --pipeline can be run locally (it deploys the pipeline stack, not the app)
    if (args.pipeline) {
      const pipelineDeployer = new PipelineStackDeployer();
      await pipelineDeployer.deployPipeline(process.cwd());
      return;
    }

    if (!this.isCiEnvironment) {
      throw new AmplifyUserError('RunningPipelineDeployNotInCiError', {
        message:
          'It looks like this command is being run outside of a CI/CD workflow.',
        resolution: `To deploy locally use ${format.normalizeAmpxCommand(
          'sandbox',
        )} instead.`,
      });
    }

    // Build placeholder identifier from CLI args
    const backendId: BackendIdentifier =
      args.appId && args.branch
        ? { namespace: args.appId, name: args.branch, type: 'branch' }
        : { namespace: 'standalone', name: 'default', type: 'standalone' };

    const result = await this.backendDeployer.deploy(backendId, {
      validateAppSources: true,
      branch: args.branch,
      appId: args.appId,
    });

    // For standalone, use the CFN stack name for client config generation.
    const clientConfigIdentifier =
      result.stackName && result.backendId?.type === 'standalone'
        ? { stackName: result.stackName }
        : (result.backendId ?? backendId);

    await this.clientConfigGenerator.generateClientConfigToFile(
      clientConfigIdentifier,
      args.outputsVersion as ClientConfigVersion,
      args.outputsOutDir,
      args.outputsFormat,
    );

    // Deploy frontend if --infrastructure is set
    if (args.infrastructure) {
      const frontendDeployer = new FrontendDeployer();
      await frontendDeployer.deployFrontend(process.cwd());
    }
  };

  builder = (yargs: Argv): Argv<PipelineDeployCommandOptions> => {
    return yargs
      .version(false)
      .option('branch', {
        describe: 'Name of the git branch being deployed',
        demandOption: false,
        type: 'string',
        array: false,
      })
      .option('app-id', {
        describe:
          'The app id of the target Amplify app. Required for Amplify Hosting deployments, must be omitted when backend.ts uses a custom CDK App.',
        demandOption: false,
        type: 'string',
        array: false,
      })
      .option('infrastructure', {
        describe:
          'Deploy backend + frontend infrastructure. Deploys amplify/frontend.ts if present.',
        demandOption: false,
        type: 'boolean',
        default: false,
      })
      .option('pipeline', {
        describe:
          'Deploy the CI/CD pipeline defined in amplify/pipeline.ts. Can be run locally.',
        demandOption: false,
        type: 'boolean',
        default: false,
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
