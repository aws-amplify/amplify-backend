import { BackendDeployer } from '@aws-amplify/backend-deployer';
import { format, printer } from '@aws-amplify/cli-core';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { Argv, CommandModule } from 'yargs';

/**
 * Command that runs type checking and CDK synthesis without deployment
 */
export class CheckCommand implements CommandModule {
  command = 'check';
  describe = 'Run type checking and CDK synthesis without deployment';

  /**
   * Creates a new instance of CheckCommand
   * @param backendDeployer - The deployer used to run CDK synthesis
   */
  constructor(private readonly backendDeployer: BackendDeployer) {}

  handler = async () => {
    const backendId: BackendIdentifier = {
      namespace: 'sandbox',
      name: 'dev',
      type: 'sandbox',
    };

    let result: { deploymentTimes: { synthesisTime?: number } } = {
      deploymentTimes: {},
    };
    await printer.indicateProgress(
      'Running type checks and CDK synthesis...',
      async () => {
        result = await this.backendDeployer.deploy(backendId, {
          validateAppSources: true,
          dryRun: true,
        });
      }
    );

    printer.print(
      format.success(
        `✔ Type checking and CDK synthesis completed successfully ` +
          format.highlight(`(${result.deploymentTimes.synthesisTime ?? 0}s)`)
      )
    );
  };

  builder = (yargs: Argv) => yargs;
}
