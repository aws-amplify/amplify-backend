import { execa } from 'execa';
import stream from 'stream';
import {
  BackendDeployer,
  DeployProps,
  DestroyProps,
} from './cdk_deployer_singleton_factory.js';
import { CdkErrorMapper } from './cdk_error_mapper.js';
import { BackendIdentifier, DeploymentType } from '@aws-amplify/plugin-types';
import {
  BackendLocator,
  CDKContextKey,
  DeploymentTimes,
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
  deploy = async (backendId?: BackendIdentifier, deployProps?: DeployProps) => {
    await this.invokeTsc(deployProps);

    const cdkCommandArgs: string[] = [];
    if (deployProps?.deploymentType === 'sandbox') {
      cdkCommandArgs.push('--hotswap-fallback');
      cdkCommandArgs.push('--method=direct');
      if (deployProps.secretLastUpdated) {
        cdkCommandArgs.push(
          '--context',
          `secretLastUpdated=${deployProps.secretLastUpdated.getTime()}`
        );
      }
    }

    const cdkOutput = await this.invokeCdk(
      InvokableCommand.DEPLOY,
      backendId,
      deployProps?.deploymentType,
      cdkCommandArgs
    );

    return {
      deploymentTimes: this.getDeploymentTimes(cdkOutput),
      hotswapped: this.deploymentHotswapped(cdkOutput),
    };
  };

  /**
   * Invokes cdk destroy command
   */
  destroy = async (
    backendId?: BackendIdentifier,
    destroyProps?: DestroyProps
  ) => {
    const cdkOutput = await this.invokeCdk(
      InvokableCommand.DESTROY,
      backendId,
      destroyProps?.deploymentType,
      ['--force']
    );
    return {
      deploymentTimes: this.getDeploymentTimes(cdkOutput),
    };
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
    backendId?: BackendIdentifier,
    deploymentType?: DeploymentType,
    additionalArguments?: string[]
  ): Promise<string> => {
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
    if (backendId) {
      cdkCommandArgs.push(
        '--context',
        `${CDKContextKey.BACKEND_NAMESPACE}=${backendId.namespace}`,
        '--context',
        `${CDKContextKey.BACKEND_NAME}=${backendId.name}`
      );

      if (deploymentType !== 'sandbox') {
        cdkCommandArgs.push('--require-approval', 'never');
      }
    }

    if (deploymentType) {
      cdkCommandArgs.push(
        '--context',
        `${CDKContextKey.DEPLOYMENT_TYPE}=${deploymentType}`
      );
    }

    if (additionalArguments) {
      cdkCommandArgs.push(...additionalArguments);
    }

    try {
      return await this.executeChildProcess('npx', cdkCommandArgs);
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
    let aggregatedStdout = '';
    const aggregatorStderrStream = new stream.Writable();
    const aggregatorStdoutStream = new stream.Writable();
    aggregatorStderrStream._write = function (chunk, encoding, done) {
      aggregatedStderr += chunk;
      done();
    };
    aggregatorStdoutStream._write = function (chunk, encoding, done) {
      aggregatedStdout += chunk;
      done();
    };
    const childProcess = execa(command, cdkCommandArgs, {
      stdin: 'inherit',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    childProcess.stderr?.pipe(aggregatorStderrStream);
    childProcess.stdout?.pipe(aggregatorStdoutStream);
    childProcess.stdout?.pipe(process.stdout);
    try {
      await childProcess;
      return aggregatedStdout;
    } catch (error) {
      // swallow execa error which is not really helpful, rather throw stderr
      throw new Error(aggregatedStderr);
    }
  };

  private getDeploymentTimes = (cdkOutput: string) => {
    const deploymentTimes: DeploymentTimes = {};
    // the time can be in fractional or whole seconds. 24.3, 24, 24.22 etc.
    const regexTotalTime = /✨ {2}Total time: (\d*\.*\d*)s.*/;
    const totalTime = cdkOutput.match(regexTotalTime);
    if (totalTime && totalTime.length > 1 && !isNaN(+totalTime[1])) {
      deploymentTimes.totalTime = +totalTime[1];
    }

    const regexSynthTime = /✨ {2}Synthesis time: (\d*\.*\d*)s/;
    const synthTime = cdkOutput.match(regexSynthTime);
    if (synthTime && synthTime.length > 1 && !isNaN(+synthTime[1])) {
      deploymentTimes.synthesisTime = +synthTime[1];
    }

    return deploymentTimes;
  };

  private deploymentHotswapped = (cdkOutput: string) => {
    const regexTotalTime = /✨.*hotswapped!/;
    return regexTotalTime.test(cdkOutput);
  };
}
