import _isCI from 'is-ci';
import { Argv, CommandModule } from 'yargs';
import { BackendDeployer } from '@aws-amplify/backend-deployer';
import {
  BackendDeploymentType,
  BranchBackendIdentifier,
} from '@aws-amplify/platform-core';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { ArgumentsKebabCase } from '../../kebab_case.js';

export type PipelineDeployCommandOptions =
  ArgumentsKebabCase<PipelineDeployCommandOptionsCamelCase>;

type PipelineDeployCommandOptionsCamelCase = {
  branch: string;
  appId: string;
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
  readonly describe: false;

  /**
   * Creates top level entry point for deploy command.
   */
  constructor(
    private readonly clientConfigGenerator: ClientConfigGeneratorAdapter,
    private readonly backendDeployer: BackendDeployer,
    private readonly isCiEnvironment: typeof _isCI = _isCI
  ) {
    this.command = 'pipeline-deploy';
    // use false for a hidden command
    this.describe = false;
  }

  /**
   * @inheritDoc
   */
  handler = async (args: PipelineDeployCommandOptions): Promise<void> => {
    if (!this.isCiEnvironment) {
      throw new Error(
        'It looks like this command is being run outside of a CI/CD workflow. To deploy locally use `amplify sandbox` instead.'
      );
    }

    const uniqueBackendIdentifier = new BranchBackendIdentifier(
      args['app-id'],
      args.branch
    );
    await this.backendDeployer.deploy(uniqueBackendIdentifier, {
      deploymentType: BackendDeploymentType.BRANCH,
      validateAppSources: true,
    });
    await this.clientConfigGenerator.generateClientConfigToFile(
      uniqueBackendIdentifier
    );
  };

  builder = (yargs: Argv): Argv<PipelineDeployCommandOptions> => {
    return yargs
      .option('branch', {
        describe: 'Name of the git branch being deployed',
        demandOption: true,
        type: 'string',
        array: false,
      })
      .option('app-id', {
        describe: 'The app id of the target Amplify app',
        demandOption: true,
        type: 'string',
        array: false,
      });
  };
}
