import debounce from 'debounce-promise';
import { execa } from 'execa';

/**
 * Execute CDK commands.
 */
export class AmplifyCDKExecutor {
  /**
   * Function that deploys backend resources using CDK.
   * Debounce is added in case multiple duplicate events are received.
   */
  invokeCDKWithDebounce = debounce(
    async (cdkCommand: CDKCommand, cdkOptions?: CDKOptions): Promise<void> => {
      console.debug(`[Sandbox] Executing cdk ${cdkCommand.toString()}`);

      // Basic args
      const cdkCommandArgs = [
        'cdk',
        cdkCommand.toString(),
        '--app',
        "'npx tsx index.ts'",
      ];

      // Add context information if available
      if (cdkOptions?.projectName && cdkOptions?.environmentName) {
        cdkCommandArgs.push(
          '--context',
          `project-name=${cdkOptions?.projectName}`,
          '--context',
          `environment-name=${cdkOptions?.environmentName}`
        );
      }

      // Sandbox deploys and destroys fast
      if (cdkCommand === CDKCommand.DEPLOY) {
        cdkCommandArgs.push('--hotswap-fallback', '--method=direct');
      } else if (cdkCommand == CDKCommand.DESTROY) {
        cdkCommandArgs.push('--force');
      }

      // call execa for executing the command line
      await this.executeChildProcess('npx', cdkCommandArgs);
    },
    100
  );

  /**
   * Wrapper for the child process executor. Helps in unit testing as node:test framework
   * doesn't have capabilities to mock exported functions like `execa` as of right now.
   */
  executeChildProcess = async (command: string, cdkCommandArgs: string[]) => {
    await execa(command, cdkCommandArgs, {
      stdout: 'inherit',
      stderr: 'inherit',
    });
  };
}

export enum CDKCommand {
  DEPLOY = 'deploy',
  DESTROY = 'destroy',
}

export type CDKOptions = {
  projectName?: string;
  environmentName?: string;
};
