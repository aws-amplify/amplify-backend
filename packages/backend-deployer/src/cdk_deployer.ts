import stream from 'stream';
import readline from 'readline';
import {
  BackendDeployer,
  DeployProps,
  DeployResult,
  DestroyProps,
  DestroyResult,
} from './cdk_deployer_singleton_factory.js';
import { CDKDeploymentError, CdkErrorMapper } from './cdk_error_mapper.js';
import {
  BackendIdentifier,
  type PackageManagerController,
} from '@aws-amplify/plugin-types';
import {
  AmplifyError,
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
  SYNTH = 'synth',
}

/**
 * Invokes CDK command via execa
 */
export class CDKDeployer implements BackendDeployer {
  private readonly relativeCloudAssemblyLocation = '.amplify/artifacts/cdk.out';
  /**
   * Instantiates instance of CDKDeployer
   */
  constructor(
    private readonly cdkErrorMapper: CdkErrorMapper,
    private readonly backendLocator: BackendLocator,
    private readonly packageManagerController: PackageManagerController
  ) {}
  /**
   * Invokes cdk deploy command
   */
  deploy = async (backendId: BackendIdentifier, deployProps?: DeployProps) => {
    const cdkCommandArgs: string[] = [];
    if (backendId.type === 'sandbox') {
      cdkCommandArgs.push('--hotswap-fallback');
      cdkCommandArgs.push('--method=direct');
      if (deployProps?.secretLastUpdated) {
        cdkCommandArgs.push(
          '--context',
          `secretLastUpdated=${deployProps.secretLastUpdated.getTime()}`
        );
      }
    }

    if (deployProps?.profile) {
      cdkCommandArgs.push('--profile', deployProps.profile);
    }

    // first synth with the backend definition but suppress any errors.
    // We want to show errors from the TS compiler rather than the ESBuild as
    // TS errors are more relevant (Library validations are type reliant).
    const startTime = Date.now();
    let synthError = undefined;
    try {
      await this.tryInvokeCdk(
        InvokableCommand.SYNTH,
        backendId,
        this.getAppCommand(),
        cdkCommandArgs.concat('--quiet') // don't print the CFN template to stdout
      );
    } catch (e) {
      synthError = e;
    }
    // CDK prints synth time in seconds rounded to 2 decimal places. Here we duplicate that behavior.
    const synthTimeSeconds = Math.floor((Date.now() - startTime) / 10) / 100;

    // then run type checks
    try {
      await this.invokeTsc(deployProps);
    } catch (typeError: unknown) {
      if (
        synthError &&
        AmplifyError.isAmplifyError(typeError) &&
        typeError.cause?.message.match(
          /Cannot find module '\$amplify\/env\/.*' or its corresponding type declarations/
        )
      ) {
        // synth has failed and we don't have auto generated function environment definition files. This
        // resulted in the exception caught here, which is not very useful for the customers.
        // We instead throw the synth error for customers to fix what caused the synth to fail.
        throw synthError;
      }
      throw typeError;
    }

    // If somehow TSC was successful but synth wasn't, we now throw to surface the synth error
    if (synthError) {
      throw synthError;
    }

    // then deploy with the cloud assembly that was generated during synth
    const deployResult = await this.tryInvokeCdk(
      InvokableCommand.DEPLOY,
      backendId,
      this.relativeCloudAssemblyLocation,
      cdkCommandArgs
    );

    return {
      deploymentTimes: {
        synthesisTime: synthTimeSeconds,
        totalTime:
          synthTimeSeconds + (deployResult?.deploymentTimes?.totalTime || 0),
      },
    };
  };

  /**
   * Invokes cdk destroy command
   */
  destroy = async (
    backendId: BackendIdentifier,
    destroyProps?: DestroyProps
  ) => {
    const cdkCommandArgs: string[] = ['--force'];
    if (destroyProps?.profile) {
      cdkCommandArgs.push('--profile', destroyProps.profile);
    }
    return this.tryInvokeCdk(
      InvokableCommand.DESTROY,
      backendId,
      this.getAppCommand(),
      cdkCommandArgs
    );
  };

  /**
   * Wrapper for the child process executor. Helps in unit testing as node:test framework
   * doesn't have capabilities to mock exported functions like `execa` as of right now.
   */
  executeCommand = async (
    commandArgs: string[],
    options: { redirectStdoutToStderr: boolean } = {
      redirectStdoutToStderr: false,
    }
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
    const childProcess = this.packageManagerController.runWithPackageManager(
      commandArgs,
      process.cwd(),
      {
        stdin: 'inherit',
        stdout: 'pipe',
        stderr: 'pipe',
        // Piping the output by default strips off the color. This is a workaround to
        // preserve the color being piped to parent process.
        extendEnv: true,
        env: { FORCE_COLOR: '1' },
      }
    );

    childProcess.stderr?.pipe(aggregatorStderrStream);

    if (options?.redirectStdoutToStderr) {
      childProcess.stdout?.pipe(aggregatorStderrStream);
    } else {
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
      // swallow execa error if the cdk cli ran and produced some stderr.
      // Most of the time this error is noise(basically child exited with exit code...)
      // bubbling this up to customers add confusion (Customers don't need to know we are running IPC calls
      // and their exit codes printed while sandbox continue to run). Hence we explicitly don't pass error in the cause
      // rather throw the entire stderr for clients to figure out what to do with it.
      // However if the cdk process didn't run or produced no output, then we have nothing to go on with. So we throw
      // this error to aid in some debugging.
      if (aggregatedStderr.trim()) {
        // eslint-disable-next-line amplify-backend-rules/prefer-amplify-errors
        throw new Error(aggregatedStderr);
      } else {
        throw error;
      }
    }
  };

  private getAppCommand = () =>
    this.packageManagerController.getCommand([
      'tsx',
      this.backendLocator.locate(),
    ]);

  private invokeTsc = async (deployProps?: DeployProps) => {
    if (!deployProps?.validateAppSources) {
      return;
    }
    try {
      await this.executeCommand(
        [
          'tsc',
          '--showConfig',
          '--project',
          dirname(this.backendLocator.locate()),
        ],
        { redirectStdoutToStderr: true } // TSC prints errors to stdout by default
      );
    } catch (error) {
      // If we cannot load ts config, turn off type checking
      return;
    }
    try {
      await this.executeCommand(
        [
          'tsc',
          '--noEmit',
          '--skipLibCheck',
          // pointing the project arg to the amplify backend directory will use the tsconfig present in that directory
          '--project',
          dirname(this.backendLocator.locate()),
        ],
        { redirectStdoutToStderr: true } // TSC prints errors to stdout by default
      );
    } catch (err) {
      throw new AmplifyUserError<CDKDeploymentError>(
        'SyntaxError',
        {
          message: 'TypeScript validation check failed.',
          resolution:
            'Fix the syntax and type errors in your backend definition.',
        },
        err instanceof Error ? err : undefined
      );
    }
  };

  /**
   * calls invokeCDK and wrap it in a try catch
   */
  private tryInvokeCdk = async (
    invokableCommand: InvokableCommand,
    backendId: BackendIdentifier,
    appArgument: string,
    additionalArguments?: string[]
  ): Promise<DeployResult | DestroyResult> => {
    try {
      return await this.invokeCdk(
        invokableCommand,
        backendId,
        appArgument,
        additionalArguments
      );
    } catch (err) {
      throw this.cdkErrorMapper.getAmplifyError(err as Error);
    }
  };

  /**
   * Executes a CDK command
   */
  private invokeCdk = async (
    invokableCommand: InvokableCommand,
    backendId: BackendIdentifier,
    appArgument: string,
    additionalArguments?: string[]
  ): Promise<DeployResult | DestroyResult> => {
    // Basic args
    const cdkCommandArgs = [
      'cdk',
      invokableCommand.toString(),
      // This is unfortunate. CDK writes everything to stderr without `--ci` flag and we need to differentiate between the two.
      // See https://github.com/aws/aws-cdk/issues/7717 for more details.
      '--ci',
      '--app',
      appArgument,
      '--all',
      '--output',
      this.relativeCloudAssemblyLocation,
    ];

    // Add context information if available
    cdkCommandArgs.push(
      '--context',
      `${CDKContextKey.BACKEND_NAMESPACE}=${backendId.namespace}`,
      '--context',
      `${CDKContextKey.BACKEND_NAME}=${backendId.name}`
    );

    if (backendId.type !== 'sandbox') {
      cdkCommandArgs.push('--require-approval', 'never');
    }

    cdkCommandArgs.push(
      '--context',
      `${CDKContextKey.DEPLOYMENT_TYPE}=${backendId.type}`
    );

    if (additionalArguments) {
      cdkCommandArgs.push(...additionalArguments);
    }

    return await this.executeCommand(cdkCommandArgs);
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
