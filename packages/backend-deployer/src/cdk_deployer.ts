import stream from 'stream';
import readline from 'readline';
import {
  BackendDeployer,
  DeployProps,
  DeployResult,
  DestroyResult,
} from './cdk_deployer_singleton_factory.js';
import { CDKDeploymentError, CdkErrorMapper } from './cdk_error_mapper.js';
import {
  BackendIdentifier,
  type PackageManagerController,
} from '@aws-amplify/plugin-types';
import {
  AmplifyUserError,
  BackendIdentifierConversions,
  BackendLocator,
  CDKContextKey,
} from '@aws-amplify/platform-core';
import { dirname } from 'path';
import { StackActivityMonitor } from './display/deployment_progress.js';
import { format, printer } from '@aws-amplify/cli-core';

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
  private deploymentMonitorStarted: boolean;
  /**
   * Instantiates instance of CDKDeployer
   */
  constructor(
    private readonly cdkErrorMapper: CdkErrorMapper,
    private readonly backendLocator: BackendLocator,
    private readonly packageManagerController: PackageManagerController,
    private readonly cfnDeploymentMonitor?: StackActivityMonitor
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

    // first synth with the backend definition but suppress any errors.
    // We want to show errors from the TS compiler rather than the ESBuild as
    // TS errors are more relevant (Library validations are type reliant).
    const synthStartTime = Date.now();
    let synthError = undefined;
    try {
      const synthCallBack = async () =>
        await this.tryInvokeCdk(
          InvokableCommand.SYNTH,
          backendId,
          this.getAppCommand(),
          cdkCommandArgs.concat('--quiet') // don't print the CFN template to stdout
        );
      // TBD, rel definition of when to enable fancy
      if (backendId.type === 'sandbox') {
        // casting is ok because we don't care about return value here
        await printer.indicateProgress(
          'Synthesizing backend',
          synthCallBack as unknown as () => Promise<void>
        );
      } else {
        await synthCallBack();
      }
    } catch (e) {
      synthError = e;
    }
    // CDK prints synth time in seconds rounded to 2 decimal places. Here we duplicate that behavior.
    const synthTimeSeconds =
      Math.floor((Date.now() - synthStartTime) / 10) / 100;

    // TBD, rel definition of when to enable fancy
    if (backendId.type === 'sandbox') {
      printer.print(
        format.success(`✔ Backend synthesized in ${synthTimeSeconds} seconds`)
      );
    }

    const typeCheckStartTime = Date.now();
    // then run type checks
    if (backendId.type === 'sandbox') {
      // casting is ok because we don't care about return value here
      await printer.indicateProgress(
        'Running type checks',
        async () => await this.invokeTsc(deployProps)
      );
    }
    const typeCheckTimeSeconds =
      Math.floor((Date.now() - typeCheckStartTime) / 10) / 100;

    if (backendId.type === 'sandbox') {
      printer.print(
        format.success(
          `✔ Type checks completed in ${typeCheckTimeSeconds} seconds`
        )
      );
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
  destroy = async (backendId: BackendIdentifier) => {
    return this.tryInvokeCdk(
      InvokableCommand.DESTROY,
      backendId,
      this.getAppCommand(),
      ['--force']
    );
  };

  /**
   * Wrapper for the child process executor. Helps in unit testing as node:test framework
   * doesn't have capabilities to mock exported functions like `execa` as of right now.
   */
  executeCommand = async (
    commandArgs: string[],
    options: {
      printStdout: boolean;
      useFancyOutput?: boolean;
      stackName?: string;
    } = { printStdout: true }
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
        // extendEnv: true,
        // env: { FORCE_COLOR: '1' },
      }
    );

    childProcess.stderr?.pipe(aggregatorStderrStream);

    if (options?.printStdout) {
      childProcess.stdout?.pipe(process.stdout);
    }

    const cdkOutput = { deploymentTimes: {} };
    if (childProcess.stdout) {
      this.populateCDKOutputFromStdout(cdkOutput, childProcess.stdout);
    }

    let readInterface;
    try {
      if (childProcess.stdout && options.useFancyOutput) {
        readInterface = readline.createInterface(childProcess.stdout);
        await this.transformCDKOutput(readInterface, options.stackName);
      }
      await childProcess;
      return cdkOutput;
    } catch (error) {
      // swallow execa error which is most of the time noise (basically child exited with exit code...)
      // bubbling this up to customers add confusion (Customers don't need to know we are running IPC calls
      // and their exit codes printed while sandbox continue to run). Hence we explicitly don't pass error in the cause
      // rather throw the entire stderr for clients to figure out what to do with it.
      throw new Error(aggregatedStderr);
    } finally {
      await this.cfnDeploymentMonitor?.stop();
      readInterface?.close();
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
        { printStdout: false }
      );
    } catch (error) {
      // If we cannot load ts config, turn off type checking
      return;
    }
    try {
      await this.executeCommand([
        'tsc',
        '--noEmit',
        '--skipLibCheck',
        // pointing the project arg to the amplify backend directory will use the tsconfig present in that directory
        '--project',
        dirname(this.backendLocator.locate()),
      ]);
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

    const useFancyOutput =
      [InvokableCommand.DEPLOY, InvokableCommand.DESTROY].includes(
        invokableCommand
      ) && backendId.type === 'sandbox';

    return await this.executeCommand(cdkCommandArgs, {
      printStdout: false,
      useFancyOutput,
      stackName: BackendIdentifierConversions.toStackName(backendId),
    });
  };

  private populateCDKOutputFromStdout = (
    output: DeployResult | DestroyResult,
    stdout: stream.Readable
  ) => {
    const regexTotalTime = /✨ {2}Total time: (\d*\.*\d*)s.*/;
    const reader = readline.createInterface(stdout);
    reader.on('line', (line) => {
      if (!line.includes('✨')) {
        return;
      }
      // Good chance that it contains timing information
      const totalTime = line.match(regexTotalTime);
      if (totalTime && totalTime.length > 1 && !isNaN(+totalTime[1])) {
        output.deploymentTimes.totalTime = +totalTime[1];
      }
    });
  };

  private transformCDKOutput = async (
    reader: readline.Interface,
    stackName: string | undefined
  ) => {
    let resolveForAllAssetsToBePublished!: (value: unknown) => void;
    let resolveForDeploymentToBeStarted!: (value: unknown) => void;
    let resolveForHotswapDeploymentToBeFinished!: (value: unknown) => void;
    const hotSwappedChanges: string[] = [];
    let showingAssetBuildingSpinner = false;
    let progressIndicatorForDeploymentStartedPromise: Promise<void>;
    let progressIndicatorForBuildingAssetsPromise: Promise<void>;
    let progressIndicatorForHotSwappingResources: Promise<void> | undefined;

    const cancelAllIndicators = async () => {
      resolveForAllAssetsToBePublished?.(true);
      resolveForDeploymentToBeStarted?.(true);
      resolveForHotswapDeploymentToBeFinished?.(true);

      await Promise.all([
        progressIndicatorForDeploymentStartedPromise,
        progressIndicatorForBuildingAssetsPromise,
        progressIndicatorForHotSwappingResources,
      ]);
    };

    /** 
     * Flow of CDK
                                +-------------------+
                                |   Building Assets |
                                +-------------------+
                                          |
                                          v
                                +---------------------+
                                |   Publishing Assets |
                                +---------------------+
                                          |
                                          v
                                +---------------------+
                                | Starting Deployment |
                                +---------------------+
                                          |
                  +-----------------------+----------------------+
                  |                       |                      |
                  v                       v                      v
        +-------------------+  +-------------------+  +-------------------+
        |     No changes    |  |  Can't hotswap    |  |     Can hotswap   |
        +-------------------+  +-------------------+  +-------------------+
                  |                      |                       |
                  v                      v                       v
        +----------------------+  +-------------------+  +-------------------+
        | Deployment completed |  | Do CFN deployment |  |   Do hotswap      |
        |                      |  |   and monitor     |  |   deployment      |
        +----------------------+  +-------------------+  +-------------------+
                  |                       |                       |
                  -------------------------------------------------
                          |                             |
                          v                             v
            +----------------------+            +-------------------+
            | Deployment completed |            | Deployment failed |
            +----------------------+            +-------------------+
     */
    for await (const line of reader) {
      // eslint-disable-next-line no-console
      // console.log(line);

      // Publishing Assets
      if (
        line.match(
          /start: Building|success: Built|start: Publishing|success: Published/
        )
      ) {
        if (!showingAssetBuildingSpinner) {
          progressIndicatorForBuildingAssetsPromise = printer.indicateProgress(
            'Building and publishing assets',
            async () => {
              await new Promise((resolve) => {
                resolveForAllAssetsToBePublished = resolve;
              });
            }
          );
          showingAssetBuildingSpinner = true;
        }
      }

      // Publishing assets finished and deployment started
      if (line.includes('deploying...')) {
        resolveForAllAssetsToBePublished?.(true);
        await progressIndicatorForBuildingAssetsPromise!;
        printer.print(format.success(`✔ Building and publishing assets`));
        progressIndicatorForDeploymentStartedPromise = printer.indicateProgress(
          'Evaluating the diff',
          async () => {
            await new Promise((resolve) => {
              resolveForDeploymentToBeStarted = resolve;
            });;
          }
        );
      }

      // When no changes are found to be deployed
      if (line.includes('(no changes)')) {
        resolveForDeploymentToBeStarted?.(true);
        await progressIndicatorForDeploymentStartedPromise!;
        printer.print(format.note('No changes detected to deploy'));
      }

      // when all the changes can be hotswapped, we skip cfn deployment
      if (line.includes('hotswapping resources')) {
        resolveForDeploymentToBeStarted?.(true);
        await progressIndicatorForDeploymentStartedPromise!;
        progressIndicatorForHotSwappingResources = printer.indicateProgress(
          'Hot swapping resources',
          async () => {
            await new Promise((resolve) => {
              resolveForHotswapDeploymentToBeFinished = resolve;
            });
          }
        );
      }

      // Collect all the non hot swappable resources
      if (line.match(/✨.*hotswapped/)) {
        const resource = line.match(/✨ (?<resourceName>.+) '.+' hotswapped/)
          ?.groups?.resourceName;
        if (resource) {
          hotSwappedChanges.push(resource);
        }
      }

      // Can't hotswap, so performing a CFN deployment
      if (line.includes('Could not perform a hotswap deployment')) {
        resolveForDeploymentToBeStarted?.(true);
        await progressIndicatorForDeploymentStartedPromise!;
        printer.print(format.highlight(`Found non hot-swappable changes.`));
        printer.print(`Performing a CFN deployment`);
      }

      // CFN deployment has started, start the progress monitor
      if (line.match(/(creating|updating) stack.../) && stackName) {
        this.cfnDeploymentMonitor?.start(stackName);
        this.deploymentMonitorStarted = true;
      }

      // CFN deployment failed, End state
      if (line.includes('❌ Deployment failed')) {
        if (progressIndicatorForHotSwappingResources) {
          await cancelAllIndicators();
        }
        if (this.deploymentMonitorStarted) {
          await this.cfnDeploymentMonitor?.stop();
        }
        printer.print(format.color(`❌ Deployment failed`, 'Red'));
      }

      // All types of deployment completed. End state
      if (line.includes('✨  Deployment time')) {
        if (progressIndicatorForHotSwappingResources) {
          await cancelAllIndicators();
          printer.print(
            format.success(`✔ Hot swapped resources `) +
              format.dim(`(${hotSwappedChanges.join(', ')})`)
          );
        }
        if (this.deploymentMonitorStarted) {
          await this.cfnDeploymentMonitor?.stop();
        }
        const deploymentTime = line.match(/Deployment time:\s*(?<time>.*)/)
          ?.groups?.time;
        printer.print(
          format.success(`✔ Deployment completed in ${deploymentTime}`)
        );
      }
    }
  };
}
