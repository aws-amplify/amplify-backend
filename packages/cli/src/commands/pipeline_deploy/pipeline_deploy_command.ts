import isCI from 'is-ci';
import { AmplifyClient, GetAppCommand } from '@aws-sdk/client-amplify';
import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import {
  BackendDeployer,
  InvokableCommand,
} from '@aws-amplify/backend-deployer';

export type PipelineDeployCommandOptions = {
  branch: string;
  appId: string;
};

const ensureAppIsAvailable = async (appId: string): Promise<void> => {
  const client = new AmplifyClient();
  const command = new GetAppCommand({ appId });
  try {
    const output = await client.send(command);
    if (!output.app) {
      throw new Error(
        `Failed request for app ${appId}: ${JSON.stringify(output, null, 2)}`
      );
    }
  } catch (error) {
    throw new Error(
      'The provided App Id does not exist in the configured region, or you do not have permission to access it.'
    );
  }
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
  constructor(private readonly backendDeployer: BackendDeployer) {
    this.command = 'pipeline-deploy';
    // use false for a hidden command
    this.describe = false;
  }

  /**
   * @inheritDoc
   */
  async handler(
    args: ArgumentsCamelCase<PipelineDeployCommandOptions>
  ): Promise<void> {
    if (!isCI) {
      throw new Error(
        'It looks like this command is being run outside of a CI/CD workflow. To deploy locally use `amplify sandbox` instead.'
      );
    }

    await ensureAppIsAvailable(args.appId);
    const uniqueBackendIdentifier = {
      backendId: args.appId,
      branchName: args.branch,
    };

    await this.backendDeployer.invoke(
      InvokableCommand.DEPLOY,
      uniqueBackendIdentifier
    );
  }

  builder = (yargs: Argv): Argv<PipelineDeployCommandOptions> => {
    return yargs
      .option('branch', {
        describe: 'Name of the git branch being deployed',
        demandOption: true,
        type: 'string',
        array: false,
      })
      .option('appId', {
        describe: 'The appId of the target Amplify app',
        demandOption: true,
        type: 'string',
        array: false,
      });
  };
}
