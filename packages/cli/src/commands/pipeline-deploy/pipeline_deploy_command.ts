import _isCI from 'is-ci';
import { Argv, CommandModule } from 'yargs';
import { BackendDeployer } from '@aws-amplify/backend-deployer';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { ArgumentsKebabCase } from '../../kebab_case.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { ClientConfigVersion } from '@aws-amplify/client-config';

export type PipelineDeployCommandOptions =
  ArgumentsKebabCase<PipelineDeployCommandOptionsCamelCase>;

type PipelineDeployCommandOptionsCamelCase = {
  branch: string;
  appId: string;
  configVersion: string;
  configOutDir?: string;
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

    const backendId: BackendIdentifier = {
      namespace: args['app-id'],
      name: args.branch,
      type: 'branch',
    };
    await this.backendDeployer.deploy(backendId, {
      validateAppSources: true,
    });
    await this.clientConfigGenerator.generateClientConfigToFile(
      backendId,
      args['config-version'] as ClientConfigVersion,
      args['config-out-dir']
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
        demandOption: true,
        type: 'string',
        array: false,
      })
      .option('config-out-dir', {
        describe:
          'A path to directory where config is written. If not provided defaults to current process working directory.',
        type: 'string',
        array: false,
      })
      .option('config-version', {
        describe:
          'Version of the client config. Version 0 represents classic amplify-cli client config (Default)',
        type: 'string',
        array: false,
        choices: ['0', '1', '2'],
        default: '0',
      });
  };
}
