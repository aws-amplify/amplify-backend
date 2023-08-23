import debounce from 'debounce-promise';
import { execa } from 'execa';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import stream from 'stream';

/**
 * Execute CDK commands.
 */
export class AmplifyCDKExecutor {
  // the entry point relative to cwd where the backend definition is expected
  private readonly relativeBackendEntryPoint = 'amplify/backend.ts';
  /**
   * Function that deploys backend resources using CDK.
   * Debounce is added in case multiple duplicate events are received.
   */
  invokeCDKWithDebounce = debounce(
    async (
      cdkCommand: CDKCommand,
      cdkOptions?: UniqueBackendIdentifier
    ): Promise<void> => {
      console.debug(`[Sandbox] Executing cdk ${cdkCommand.toString()}`);

      // Basic args
      const cdkCommandArgs = [
        'cdk',
        cdkCommand.toString(),
        // This is unfortunate. CDK writes everything to stderr without `--ci` flag and we need to differentiate between the two.
        // See https://github.com/aws/aws-cdk/issues/7717 for more details.
        '--ci',
        '--app',
        `'npx tsx ${this.relativeBackendEntryPoint}'`,
      ];

      // Add context information if available
      if (cdkOptions) {
        cdkCommandArgs.push(
          '--context',
          `backend-id=${cdkOptions.backendId}`,
          '--context',
          `branch-name=${cdkOptions.branchName}`
        );
      }

      // Sandbox deploys and destroys fast
      if (cdkCommand === CDKCommand.DEPLOY) {
        cdkCommandArgs.push('--hotswap-fallback', '--method=direct');
      } else if (cdkCommand == CDKCommand.DESTROY) {
        cdkCommandArgs.push('--force');
      }

      // call execa for executing the command line
      try {
        await this.executeChildProcess('npx', cdkCommandArgs);
      } catch (error) {
        let message;
        if (error instanceof Error) message = error.message;
        else message = String(error);
        console.log(message);
        // do not propagate and let the sandbox continue to run
      }
    },
    100
  );

  /**
   * Wrapper for the child process executor. Helps in unit testing as node:test framework
   * doesn't have capabilities to mock exported functions like `execa` as of right now.
   */
  executeChildProcess = async (command: string, cdkCommandArgs: string[]) => {
    // We let the stdout and stdin inherit and streamed to parent process but pipe
    // the stderr and use it to throw on failure. This is to prevent actual
    // actionable errors being hidden amongst the stdout. Moreover execa errors are
    // useless when calling CLIs unless you made execa calling error.
    let aggregatedStderr = '';
    const aggregatorStream = new stream.Writable();
    aggregatorStream._write = function (chunk, encoding, done) {
      aggregatedStderr += chunk;
      done();
    };
    const childProcess = execa(command, cdkCommandArgs, {
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'pipe',
    });
    childProcess.stderr?.pipe(aggregatorStream);

    try {
      await childProcess;
    } catch (error) {
      // swallow execa error which is not really helpful, rather throw stderr
      throw new Error(aggregatedStderr);
    }
  };
}

export enum CDKCommand {
  DEPLOY = 'deploy',
  DESTROY = 'destroy',
}
