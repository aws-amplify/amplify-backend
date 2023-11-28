import { execa } from 'execa';
import stream from 'stream';
import readline from 'readline';
import {
  BackendDeployer,
  DeployProps,
  DeployResult,
  DestroyProps,
  DestroyResult,
} from './cdk_deployer_singleton_factory.js';
import { CdkErrorMapper } from './cdk_error_mapper.js';
import { BackendIdentifier, DeploymentType } from '@aws-amplify/plugin-types';
import {
  AmplifyUserError,
  BackendLocator,
  CDKContextKey,
} from '@aws-amplify/platform-core';
import { dirname } from 'path';

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

    return this.invokeCdk(
      InvokableCommand.DEPLOY,
      backendId,
      deployProps?.deploymentType,
      cdkCommandArgs
    );
  };

  /**
   * Invokes cdk destroy command
   */
  destroy = async (
    backendId?: BackendIdentifier,
    destroyProps?: DestroyProps
  ) => {
    return this.invokeCdk(
      InvokableCommand.DESTROY,
      backendId,
      destroyProps?.deploymentType,
      ['--force']
    );
  };

  private invokeTsc = async (deployProps?: DeployProps) => {
    if (!deployProps?.validateAppSources) {
      return;
    }
    try {
      await this.executeChildProcess(
        'npx',
        [
          'tsc',
          '--showConfig',
          '--project',
          dirname(this.backendLocator.locate()),
        ],
        { printStdout: false }
      );
    } catch (error) {
      // If we cannot load ts config, turn off type checking
      return;
    }
    try {
      await this.executeChildProcess('npx', [
        'tsc',
        '--noEmit',
        '--skipLibCheck',
        // pointing the project arg to the amplify backend directory will use the tsconfig present in that directory
        '--project',
        dirname(this.backendLocator.locate()),
      ]);
    } catch (err) {
      throw new AmplifyUserError('SyntaxError', {
        message:
          'TypeScript validation check failed, check your backend definition',
      });
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
  ): Promise<DeployResult | DestroyResult> => {
    try {
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

      return await this.executeChildProcess('npx', cdkCommandArgs);
    } catch (err) {
      throw this.cdkErrorMapper.getAmplifyError(err as Error);
    }
  };

  /**
   * Wrapper for the child process executor. Helps in unit testing as node:test framework
   * doesn't have capabilities to mock exported functions like `execa` as of right now.
   */
  executeChildProcess = async (
    command: string,
    commandArgs: string[],
    options: { printStdout: boolean } = { printStdout: true }
  ) => {
    // We let the stdout and stdin inherit and streamed to parent process but pipe
    // the stderr and use it to throw on failure. This is to prevent actual
    // actionable errors being hidden among the stdout. Moreover execa errors are
    // useless when calling CLIs unless you made execa calling error.
    let aggregatedStderr = '';
    const aggregatorStderrStream = new stream.Writable();
    aggregatorStderrStream._write = function (chunk, encoding, done) {
      aggregatedStderr += chunk;
      done();
    };

    const childProcess = execa(command, commandArgs, {
      stdin: 'inherit',
      stdout: 'pipe',
      stderr: 'pipe',

      // Piping the output by default strips off the color. This is a workaround to
      // preserve the color being piped to parent process.
      extendEnv: true,
      env: { FORCE_COLOR: '1' },
    });
    childProcess.stderr?.pipe(aggregatorStderrStream);

    if (options?.printStdout) {
      childProcess.stdout?.pipe(process.stdout);
    }

    const cdkOutput = { deploymentTimes: {} };
    if (childProcess.stdout) {
      await this.populateCDKOutputFromStdout(cdkOutput, childProcess.stdout);
    }

    try {
      await childProcess;
      return cdkOutput;
    } catch (error) {
      // swallow execa error which is not really helpful rather throw the entire stderr
      // for clients to figure out what to do with it.
      throw new Error(aggregatedStderr);
    }
  };

  private populateCDKOutputFromStdout = async (
    output: DeployResult | DestroyResult,
    stdout: stream.Readable
  ) => {
    const regexTotalTime = /✨ {2}Total time: (\d*\.*\d*)s.*/;
    const regexSynthTime = /✨ {2}Synthesis time: (\d*\.*\d*)s/;
    const reader = readline.createInterface(stdout);
    for await (const line of reader) {
      if (line.includes('✨')) {
        // Good chance that it contains timing information
        const totalTime = line.match(regexTotalTime);
        if (totalTime && totalTime.length > 1 && !isNaN(+totalTime[1])) {
          output.deploymentTimes.totalTime = +totalTime[1];
        }
        const synthTime = line.match(regexSynthTime);
        if (synthTime && synthTime.length > 1 && !isNaN(+synthTime[1])) {
          output.deploymentTimes.synthesisTime = +synthTime[1];
        }
      }
    }
  };
}
