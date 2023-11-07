import { execa } from 'execa';
import stream from 'stream';
import {
  BackendDeployer,
  DeployProps,
  DestroyProps,
} from './cdk_deployer_singleton_factory.js';
import { CdkErrorMapper } from './cdk_error_mapper.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import {
  BackendDeploymentType,
  BackendLocator,
} from '@aws-amplify/platform-core';
import { BackendDeployerEnvironmentVariables } from './environment_variables.js';

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
  constructor(
    private readonly cdkErrorMapper: CdkErrorMapper,
    private readonly backendLocator: BackendLocator
  ) {}
  /**
   * Invokes cdk deploy command
   */
  deploy = async (
    uniqueBackendIdentifier?: UniqueBackendIdentifier,
    deployProps?: DeployProps
  ) => {
    await this.invokeTsc(deployProps);

    const cdkCommandArgs: string[] = [];
    if (deployProps?.deploymentType === BackendDeploymentType.SANDBOX) {
      cdkCommandArgs.push('--hotswap-fallback');
      cdkCommandArgs.push('--method=direct');
      if (deployProps.secretLastUpdated) {
        cdkCommandArgs.push(
          '--context',
          `secretLastUpdated=${deployProps.secretLastUpdated.getTime()}`
        );
      }
    }

    await this.invokeCdk(
      InvokableCommand.DEPLOY,
      uniqueBackendIdentifier,
      deployProps?.deploymentType,
      cdkCommandArgs
    );
  };

  /**
   * Invokes cdk destroy command
   */
  destroy = async (
    uniqueBackendIdentifier?: UniqueBackendIdentifier,
    destroyProps?: DestroyProps
  ) => {
    await this.invokeCdk(
      InvokableCommand.DESTROY,
      uniqueBackendIdentifier,
      destroyProps?.deploymentType,
      ['--force']
    );
  };

  private invokeTsc = async (deployProps?: DeployProps) => {
    if (
      process.env[
        BackendDeployerEnvironmentVariables
          .ALWAYS_DISABLE_APP_SOURCES_VALIDATION
      ] === 'true'
    ) {
      return;
    }

    if (deployProps?.validateAppSources) {
      await this.executeChildProcess('npx', [
        'tsc',
        '--noEmit',
        '--skipLibCheck',
        '--module',
        'node16',
        '--moduleResolution',
        'node16',
        '--target',
        'es2022',
        this.backendLocator.locate(),
      ]);
    }
  };

  /**
   * Executes a CDK command
   */
  private invokeCdk = async (
    invokableCommand: InvokableCommand,
    uniqueBackendIdentifier?: UniqueBackendIdentifier,
    deploymentType?: BackendDeploymentType,
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
      `'npx tsx ${this.backendLocator.locate()}'`,
      '--all',
      '--output',
      '.amplify/artifacts/cdk.out',
    ];

    // Add context information if available
    if (uniqueBackendIdentifier) {
      cdkCommandArgs.push(
        '--context',
        `backend-id=${uniqueBackendIdentifier.backendId}`
      );

      if (deploymentType !== BackendDeploymentType.SANDBOX) {
        cdkCommandArgs.push(
          '--context',
          `branch-name=${uniqueBackendIdentifier.disambiguator}`,
          '--require-approval',
          'never'
        );
      }
    }

    if (deploymentType) {
      cdkCommandArgs.push('--context', `deployment-type=${deploymentType}`);
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
