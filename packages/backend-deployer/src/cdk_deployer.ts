import { execa } from 'execa';
import stream from 'stream';
import {
  BranchBackendIdentifier,
  SandboxBackendIdentifier,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';
import {
  BackendDeployer,
  DeployProps,
} from './cdk_deployer_singleton_factory.js';
import { CdkErrorMapper } from './cdk_error_mapper.js';

const relativeBackendEntryPoint = 'amplify/backend.ts';

/**
 * Commands that can be invoked
 */
enum InvokableCommand {
  DEPLOY = 'deploy',
  DESTROY = 'destroy',
}

/**
 * Invokes CDK command via execa
 */
export class CDKDeployer implements BackendDeployer {
  /**
   * Instantiates instance of CDKDeployer
   */
  constructor(private readonly cdkErrorMapper: CdkErrorMapper) {}
  /**
   * Invokes cdk deploy command
   */
  deploy = async (
    uniqueBackendIdentifier?: UniqueBackendIdentifier,
    deployProps?: DeployProps
  ) => {
    const cdkCommandArgs: string[] = [];
    if (deployProps?.hotswapFallback) {
      cdkCommandArgs.push('--hotswap-fallback');
    }
    if (deployProps?.method) {
      cdkCommandArgs.push(`--method=${deployProps.method}`);
    }
    await this.invoke(
      InvokableCommand.DEPLOY,
      uniqueBackendIdentifier,
      cdkCommandArgs
    );
  };

  /**
   * Invokes cdk destroy command
   */
  destroy = async (uniqueBackendIdentifier?: UniqueBackendIdentifier) => {
    await this.invoke(InvokableCommand.DESTROY, uniqueBackendIdentifier, [
      '--force',
    ]);
  };

  /**
   * Executes a CDK command
   */
  private invoke = async (
    invokableCommand: InvokableCommand,
    uniqueBackendIdentifier?: UniqueBackendIdentifier,
    additionalArguments?: string[]
  ) => {
    // Basic args
    const cdkCommandArgs = [
      'cdk',
      invokableCommand.toString(),
      // This is unfortunate. CDK writes everything to stderr without `--ci` flag and we need to differentiate between the two.
      // See https://github.com/aws/aws-cdk/issues/7717 for more details.
      '--ci',
      '--app',
      `'npx tsx ${relativeBackendEntryPoint}'`,
    ];

    // Add context information if available
    if (uniqueBackendIdentifier) {
      const branchName: string =
        (uniqueBackendIdentifier as BranchBackendIdentifier).branchName ??
        (uniqueBackendIdentifier as SandboxBackendIdentifier).sandbox;
      cdkCommandArgs.push(
        '--context',
        `backend-id=${uniqueBackendIdentifier.backendId}`,
        '--context',
        `branch-name=${branchName}`
      );
    }

    if (additionalArguments) {
      cdkCommandArgs.push(...additionalArguments);
    }

    try {
      await this.executeChildProcess('npx', cdkCommandArgs);
    } catch (err) {
      throw this.cdkErrorMapper.getHumanReadableError(err as Error);
    }
  };

  /**
   * Wrapper for the child process executor. Helps in unit testing as node:test framework
   * doesn't have capabilities to mock exported functions like `execa` as of right now.
   */
  executeChildProcess = async (command: string, cdkCommandArgs: string[]) => {
    // We let the stdout and stdin inherit and streamed to parent process but pipe
    // the stderr and use it to throw on failure. This is to prevent actual
    // actionable errors being hidden among the stdout. Moreover execa errors are
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
