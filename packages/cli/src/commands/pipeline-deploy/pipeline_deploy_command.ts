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
import { LogLevel, format, printer } from '@aws-amplify/cli-core';

export type PipelineDeployCommandOptions =
  ArgumentsKebabCase<PipelineDeployCommandOptionsCamelCase>;

type PipelineDeployCommandOptionsCamelCase = {
  branch: string;
  appId?: string;
  outputsFormat: ClientConfigFormat | undefined;
  outputsVersion: string;
  outputsOutDir?: string;
  standalone?: boolean;
  stackName?: string;
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
      if (!args.standalone) {
        throw new AmplifyUserError('RunningPipelineDeployNotInCiError', {
          message:
            'It looks like this command is being run outside of a CI/CD workflow.',
          resolution: `To deploy locally use ${format.normalizeAmpxCommand(
            'sandbox',
          )} instead.`,
        });
      } else {
        printer.log(
          'Warning: --standalone is intended for CI/CD environments.',
          LogLevel.WARN,
        );
      }
    }

    // For standalone, use stack-name as namespace (guaranteed by validation)
    // For regular pipeline, use appId (guaranteed by validation)
    const namespace = args.standalone ? args.stackName! : args.appId!;

    const backendId: BackendIdentifier = {
      namespace: namespace,
      name: args.branch,
      // Use 'standalone' type to avoid BranchLinker creation
      type: args.standalone ? 'standalone' : 'branch',
    };
    await this.backendDeployer.deploy(backendId, {
      validateAppSources: true,
    });
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
        describe: 'The app id of the target Amplify app',
        demandOption: false,
        type: 'string',
        array: false,
      })
      .option('standalone', {
        describe:
          'Enable standalone mode for deployment without Amplify Hosting',
        type: 'boolean',
        array: false,
        default: false,
      })
      .option('stack-name', {
        describe:
          'Custom stack name for the deployment (used with --standalone)',
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

        // Check if branch is provided
        if (!argv['branch']) {
          errors.push('--branch is required');
        } else if (argv['branch'].length === 0) {
          errors.push('--branch must be at least 1 character');
        }

        // If standalone is enabled, stack-name is required
        if (argv['standalone'] && !argv['stack-name']) {
          errors.push('--stack-name is required when --standalone is enabled');
        }

        // If standalone is not enabled, app-id is required
        if (!argv['standalone'] && !argv['app-id']) {
          errors.push('--app-id is required (unless --standalone is enabled)');
        } else if (argv['app-id'] && argv['app-id'].length === 0) {
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
