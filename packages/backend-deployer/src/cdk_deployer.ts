import stream from 'stream';
import readline from 'readline';
import process from 'node:process';
import {
  BackendDeployer,
  DeployProps,
  DeployResult,
  DestroyProps,
  DestroyResult,
} from './cdk_deployer_singleton_factory.js';
import { CDKDeploymentError, CdkErrorMapper } from './cdk_error_mapper.js';
import {
  AmplifyIOHost,
  BackendIdentifier,
  type PackageManagerController,
} from '@aws-amplify/plugin-types';
import {
  AmplifyError,
  AmplifyUserError,
  BackendLocator,
  CDKContextKey,
} from '@aws-amplify/platform-core';
import path, { dirname } from 'path';
import {
  HotswapMode,
  RequireApproval,
  StackSelectionStrategy,
  Toolkit,
} from '@aws-cdk/toolkit-lib';
import { tsImport } from 'tsx/esm/api';
import { CloudAssembly } from 'aws-cdk-lib/cx-api';
import { pathToFileURL } from 'url';

/**
 * Invokes CDK command via execa
 */
export class CDKDeployer implements BackendDeployer {
  private readonly relativeCloudAssemblyLocation = path.resolve(
    process.cwd(),
    '.amplify/artifacts/cdk.out'
  );
  /**
   * Instantiates instance of CDKDeployer
   */
  constructor(
    private readonly cdkErrorMapper: CdkErrorMapper,
    private readonly backendLocator: BackendLocator,
    private readonly packageManagerController: PackageManagerController,
    private readonly cdkToolkit: Toolkit,
    private readonly ioHost: AmplifyIOHost
  ) {}
  /**
   * Invokes cdk deploy command
   */
  deploy = async (backendId: BackendIdentifier, deployProps?: DeployProps) => {
    const contextParams: {
      [key: string]: unknown;
    } = {};

    if (backendId.type === 'sandbox') {
      if (deployProps?.secretLastUpdated) {
        contextParams['secretLastUpdated'] =
          deployProps.secretLastUpdated.getTime();
      }
    }

    // if (deployProps?.profile) {
    //   cdkCommandArgs.push('--profile', deployProps.profile);
    // }

    contextParams[CDKContextKey.BACKEND_NAMESPACE] = backendId.namespace;
    contextParams[CDKContextKey.BACKEND_NAME] = backendId.name;
    contextParams[CDKContextKey.DEPLOYMENT_TYPE] = backendId.type;

    /**
      2. Build cloud executable from dynamically importing the cdk ts file, i.e. backend.ts
      2.1 By not having a child process in this case, the `process.on('beforeExit')` does not execute
          on the CDK side resulting in the app not getting synthesized properly. So we send a signal/message
          to the same process and catch it in backend package where App is initialized to perform explicit synth
     */
    const cx = await this.cdkToolkit.fromAssemblyBuilder(
      async () => {
        await tsImport(
          pathToFileURL(this.backendLocator.locate()).toString(),
          import.meta.url
        );
        process.emit('message', 'amplifySynth', undefined);
        return new CloudAssembly(this.relativeCloudAssemblyLocation);
      },
      { context: contextParams, outdir: this.relativeCloudAssemblyLocation }
    );

    // 3. Initiate synth for the cloud executable.
    const synthStartTime = Date.now();
    let synthAssembly,
      synthError: Error | undefined = undefined;
    await this.ioHost.notify({
      message: `Backend synthesis started`,
      code: 'SYNTH_STARTED',
      action: 'amplify',
      time: new Date(),
      level: 'info',
    });

    try {
      synthAssembly = await this.cdkToolkit.synth(cx, {
        stacks: {
          strategy: StackSelectionStrategy.ALL_STACKS,
        },
      });
    } catch (error) {
      synthError = error as Error;
    }

    const synthTimeSeconds =
      Math.floor((Date.now() - synthStartTime) / 10) / 100;

    await this.ioHost.notify({
      message: `Backend synthesized in ${synthTimeSeconds} seconds`,
      code: 'SYNTH_FINISHED',
      action: 'amplify',
      time: new Date(),
      level: 'result',
    });

    // 4. Typescript compilation. For type related errors we prefer errors from here.
    const typeCheckStartTime = Date.now();
    await this.ioHost.notify({
      message: `Backend type checks started`,
      code: 'TS_STARTED',
      action: 'amplify',
      time: new Date(),
      level: 'info',
    });

    try {
      await this.invokeTsc(deployProps);
    } catch (typeError) {
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
    } finally {
      const typeCheckTimeSeconds =
        Math.floor((Date.now() - typeCheckStartTime) / 10) / 100;
      await this.ioHost.notify({
        message: `Type checks completed in ${typeCheckTimeSeconds} seconds`,
        code: 'TS_FINISHED',
        action: 'amplify',
        time: new Date(),
        level: 'result',
      });
    }

    if (synthError) {
      throw this.cdkErrorMapper.getAmplifyError(synthError);
    }

    // 5. Perform actual deployment. CFN or hotswap
    try {
      await this.cdkToolkit.deploy(synthAssembly!, {
        stacks: {
          strategy: StackSelectionStrategy.ALL_STACKS,
        },
        hotswap:
          backendId.type === 'sandbox'
            ? HotswapMode.FALL_BACK
            : HotswapMode.FULL_DEPLOYMENT,
        ci: backendId.type !== 'sandbox',
        requireApproval:
          backendId.type !== 'sandbox' ? RequireApproval.NEVER : undefined,
      });
    } catch (error) {
      throw this.cdkErrorMapper.getAmplifyError(error as Error);
    }

    // if (deployProps?.profile) {
    //   cdkCommandArgs.push('--profile', deployProps.profile);
    // }

    return {
      deploymentTimes: {
        synthesisTime: synthTimeSeconds,
        totalTime: 0,
        //synthTimeSeconds + (deployResult?.deploymentTimes?.totalTime || 0),
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
    // eslint-disable-next-line no-console
    console.log(destroyProps?.profile);
    const assembly = await this.cdkToolkit.fromAssemblyDirectory(
      this.relativeCloudAssemblyLocation
    );
    await this.cdkToolkit.destroy(assembly, {
      stacks: {
        strategy: StackSelectionStrategy.ALL_STACKS,
      },
    });
    return {
      deploymentTimes: {
        totalTime: 0,
      },
    };
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
      // eslint-disable-next-line amplify-backend-rules/propagate-error-cause
    } catch (error) {
      // swallow execa error if the cdk cli ran and produced some stderr.
      // Most of the time this error is noise(basically child exited with exit code...)
      // bubbling this up to customers add confusion (Customers don't need to know we are running IPC calls
      // and their exit codes printed while sandbox continue to run). Hence we explicitly don't pass error in the cause
      // rather throw the entire stderr for clients to figure out what to do with it.
      // However if the cdk process didn't run or produced no output, then we have nothing to go on with. So we throw
      // this error to aid in some debugging.
      if (aggregatedStderr.trim()) {
        // If the string is more than 65KB, truncate and keep the last portion.
        // eslint-disable-next-line amplify-backend-rules/prefer-amplify-errors
        throw new Error(this.truncateString(aggregatedStderr, 65000));
      } else {
        throw error;
      }
    }
  };

  private truncateString = (str: string, size: number) => {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const encoded = encoder.encode(str);
    return encoded.byteLength > size
      ? '...truncated...' + decoder.decode(encoded.slice(-size))
      : str;
  };

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
    } catch {
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
