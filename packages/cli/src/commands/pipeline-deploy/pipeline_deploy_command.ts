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

export type PipelineDeployCommandOptions =
  ArgumentsKebabCase<PipelineDeployCommandOptionsCamelCase>;

type PipelineDeployCommandOptionsCamelCase = {
  branch: string;
  appId?: string;
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
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Creates top level entry point for deploy command.
   */
  constructor(
    private readonly clientConfigGenerator: ClientConfigGeneratorAdapter,
    private readonly backendDeployer: BackendDeployer,
    private readonly isCiEnvironment: typeof _isCI = _isCI,
  ) {
    this.command = 'pipeline-deploy';
    this.describe =
      'Command to deploy backends in a custom CI/CD pipeline. This command is not intended to be used locally.';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<PipelineDeployCommandOptions>,
  ): Promise<void> => {
    if (!this.isCiEnvironment) {
      throw new AmplifyUserError('RunningPipelineDeployNotInCiError', {
        message:
          'It looks like this command is being run outside of a CI/CD workflow.',
        resolution: `To deploy locally use ${format.normalizeAmpxCommand(
          'sandbox',
        )} instead.`,
      });
    }

    // Clean any previous signal before synth
    delete process.env.AMPLIFY_CUSTOM_APP;

    const backendId: BackendIdentifier = args.appId
      ? {
          namespace: args.appId,
          name: args.branch,
          type: 'branch',
        }
      : {
          // No app-id: assume standalone via custom App in backend.ts.
          // The namespace/name are placeholders — the customer's App controls the stack.
          namespace: 'custom',
          name: args.branch,
          type: 'branch',
        };

    await this.backendDeployer.deploy(backendId, {
      validateAppSources: true,
    });

    // After synth+deploy, check for conflicts:
    // 1. Custom App used but --app-id was also provided → conflict
    // 2. No custom App and no --app-id → missing required arg
    const usesCustomApp = process.env.AMPLIFY_CUSTOM_APP === 'true';
    if (usesCustomApp && args.appId) {
      throw new AmplifyUserError('ConflictingDeploymentConfigError', {
        message:
          'Your backend.ts provides a custom CDK App to defineBackend(), but --app-id was also specified.',
        resolution:
          'Remove --app-id when using a custom App. The custom App enables standalone deployment without Amplify Hosting.',
      });
    }
    if (!usesCustomApp && !args.appId) {
      throw new AmplifyUserError('InvalidCommandInputError', {
        message:
          '--app-id is required when backend.ts does not provide a custom CDK App to defineBackend().',
        resolution:
          'Either provide --app-id for Amplify Hosting deployments, or pass a custom CDK App to defineBackend() for standalone deployments.',
      });
    }

    await this.clientConfigGenerator.generateClientConfigToFile(
      backendId,
      args.outputsVersion as ClientConfigVersion,
      args.outputsOutDir,
      args.outputsFormat,
    );
  };

  builder = (yargs: Argv): Argv<PipelineDeployCommandOptions> => {
    return yargs
      .version(false)
      .option('branch', {
        describe: 'Name of the git branch being deployed',
        demandOption: true,
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
      .check(async (argv) => {
        const errors: string[] = [];

        if (!argv['branch']) {
          errors.push('--branch is required');
        } else if (argv['branch'].length === 0) {
          errors.push('--branch must be at least 1 character');
        }

        if (argv['app-id'] !== undefined && argv['app-id'].length === 0) {
          errors.push('--app-id must be at least 1 character');
        }

        if (errors.length > 0) {
          throw new AmplifyUserError('InvalidCommandInputError', {
            message: errors.join('\n'),
            resolution: 'Provide all required arguments',
          });
        }

        return true;
      });
  };
}
