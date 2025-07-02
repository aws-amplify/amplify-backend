import debounce from 'debounce-promise';
import { subscribe as _subscribe } from '@parcel/watcher';
import { AmplifySandboxExecutor } from './sandbox_executor.js';
import {
  BackendIdSandboxResolver,
  Sandbox,
  SandboxDeleteOptions,
  SandboxEvents,
  SandboxOptions,
} from './sandbox.js';
import parseGitIgnore from 'parse-gitignore';
import path from 'path';
import fs from 'fs';
import _open from 'open';
// EventEmitter is a class name and expected to have PascalCase
// eslint-disable-next-line @typescript-eslint/naming-convention
import EventEmitter from 'events';
import {
  GetParameterCommand,
  ParameterNotFound,
  SSMClient,
  SSMServiceException,
} from '@aws-sdk/client-ssm';
import {
  AmplifyPrompter,
  LogLevel,
  Printer,
  format,
} from '@aws-amplify/cli-core';
import {
  FilesChangesTracker,
  createFilesChangesTracker,
} from './files_changes_tracker.js';
import {
  AmplifyError,
  AmplifyUserError,
  BackendIdentifierConversions,
  TelemetryPayload,
  setSpanAttributes,
  translateErrorToTelemetryErrorDetails,
} from '@aws-amplify/platform-core';
import { LambdaFunctionLogStreamer } from './lambda_function_log_streamer.js';
import { EOL } from 'os';
import { Span, trace as openTelemetryTrace } from '@opentelemetry/api';
import { DeepPartial } from '@aws-amplify/plugin-types';

/**
 * CDK stores bootstrap version in parameter store. Example parameter name looks like /cdk-bootstrap/<qualifier>/version.
 * The default value for qualifier is hnb659fds, i.e. default parameter path is /cdk-bootstrap/hnb659fds/version.
 * The default qualifier is hardcoded value without any significance.
 * Ability to provide custom qualifier is intended for name isolation between automated tests of the CDK itself.
 * In order to use custom qualifier all stack synthesizers must be programmatically configured to use it.
 * That makes bootstraps with custom qualifier incompatible with Amplify Backend and we treat that setup as
 * not bootstrapped.
 * See: https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html
 */
export const CDK_DEFAULT_BOOTSTRAP_VERSION_PARAMETER_NAME =
  // suppress spell checker, it is triggered by qualifier value.
  // eslint-disable-next-line spellcheck/spell-checker
  '/cdk-bootstrap/hnb659fds/version';
export const CDK_MIN_BOOTSTRAP_VERSION = 6;

/**
 * Constructs Amplify Console bootstrap URL for a given region
 * @param region AWS region
 * @returns Amplify Console bootstrap URL
 */
export const getBootstrapUrl = (region: string) =>
  `https://${region}.console.aws.amazon.com/amplify/create/bootstrap?region=${region}`;

/**
 * Runs a file watcher and deploys
 */
export class FileWatchingSandbox extends EventEmitter implements Sandbox {
  private watcherSubscription: Awaited<ReturnType<typeof _subscribe>>;
  private outputFilesExcludedFromWatch = ['.amplify'];
  private filesChangesTracker: FilesChangesTracker;
  private state:
    | 'running'
    | 'stopped'
    | 'deploying'
    | 'nonexistent'
    | 'unknown' = 'unknown';

  /**
   * Creates a watcher process for this instance
   */
  constructor(
    private readonly backendIdSandboxResolver: BackendIdSandboxResolver,
    private readonly executor: AmplifySandboxExecutor,
    private readonly ssmClient: SSMClient,
    private readonly functionsLogStreamer: LambdaFunctionLogStreamer,
    private readonly printer: Printer,
    private readonly open = _open,
    private readonly subscribe = _subscribe,
  ) {
    process.once('SIGINT', () => void this.stop());
    process.once('SIGTERM', () => void this.stop());
    super();
    this.interceptStderr();
  }

  /**
   * Gets the current state of the sandbox
   * @returns The current state: 'running', 'stopped', 'deploying', 'nonexistent', or 'unknown'
   */
  getState = ():
    | 'running'
    | 'stopped'
    | 'deploying'
    | 'nonexistent'
    | 'unknown' => {
    return this.state;
  };

  /**
   * @inheritdoc
   */
  override emit(eventName: SandboxEvents, ...args: unknown[]): boolean {
    return super.emit(eventName, ...args);
  }

  /**
   * @inheritdoc
   */
  override on(
    eventName: SandboxEvents,
    listener: (...args: unknown[]) => void,
  ): this {
    return super.on(eventName, listener);
  }

  /**
   * @inheritdoc
   */
  start = async (options: SandboxOptions) => {
    const watchDir = options.dir ?? './amplify';
    const watchForChanges = options.watchForChanges ?? true;

    if (!fs.existsSync(watchDir)) {
      throw new AmplifyUserError('PathNotFoundError', {
        message: `${watchDir} does not exist.`,
        resolution:
          'Make sure you are running this command from your project root directory.',
      });
    }

    // Set state to running at the beginning of start
    this.state = 'running';

    this.filesChangesTracker = await createFilesChangesTracker(watchDir);
    const bootstrapped = await this.isBootstrapped();
    // get region from an available sdk client;
    const region = await this.ssmClient.config.region();
    if (!bootstrapped) {
      this.printer.log(
        `The region ${format.highlight(
          region,
        )} has not been bootstrapped. Sign in to the AWS console as a Root user or Admin to complete the bootstrap process, then restart the sandbox.${EOL}If this is not the region you are expecting to bootstrap, check for any AWS environment variables that may be set in your shell or use ${format.command(
          '--profile <profile-name>',
        )} to specify a profile with the correct region.`,
      );
      const bootstrapUrl = getBootstrapUrl(region);
      try {
        await this.open(bootstrapUrl);
      } catch (e) {
        // If opening the link fails for any reason we fall back to
        // printing the url in the console.
        // This might happen:
        // - in headless environments
        // - if user does not have any app to open URL
        // - if browser crashes
        let logEntry = 'Unable to open bootstrap url';
        if (e instanceof Error) {
          logEntry = `${logEntry}, ${e.message}`;
        }
        this.printer.log(logEntry, LogLevel.DEBUG);
        this.printer.log(`Open ${bootstrapUrl} in the browser.`);
      }
      return;
    }

    const ignoredPaths = this.getGitIgnoredPaths();
    this.outputFilesExcludedFromWatch =
      this.outputFilesExcludedFromWatch.concat(...ignoredPaths);

    this.printer.clearConsole();
    await this.printSandboxNameInfo(options.identifier);

    // Since 'cdk deploy' is a relatively slow operation for a 'watch' process,
    // introduce a concurrency latch that tracks the state.
    // This way, if file change events arrive when a 'cdk deploy' is still executing,
    // we will batch them, and trigger another 'cdk deploy' after the current one finishes,
    // making sure 'cdk deploy's  always execute one at a time.
    // Here's a diagram showing the state transitions:

    // --------    file changed     --------------    file changed     --------------  file changed
    // |      | ------------------> |            | ------------------> |            | --------------|
    // | open |                     | deploying  |                     |   queued   |               |
    // |      | <------------------ |            | <------------------ |            | <-------------|
    // --------  'cdk deploy' done  --------------  'cdk deploy' done  --------------

    let latch: 'open' | 'deploying' | 'queued' = 'open';

    const deployAndWatch = debounce(async () => {
      latch = 'deploying';

      // Stop streaming the logs so that deployment logs don't get mixed up
      this.functionsLogStreamer.stopStreamingLogs();

      await this.deploy(options);

      // If latch is still 'deploying' after the 'await', that's fine,
      // but if it's 'queued', that means we need to deploy again
      while ((latch as 'deploying' | 'queued') === 'queued') {
        // TypeScript doesn't realize latch can change between 'awaits' ¯\_(ツ)_/¯,
        // and thinks the above 'while' condition is always 'false' without the cast
        latch = 'deploying';
        this.printer.clearConsole();
        await this.printSandboxNameInfo(options.identifier);
        this.printer.log(
          "[Sandbox] Detected file changes while previous deployment was in progress. Invoking 'sandbox' again",
        );
        await this.deploy(options);
      }
      latch = 'open';

      // Idle state, let customers know and start streaming function logs
      this.emitWatching();
      await this.functionsLogStreamer.startStreamingLogs(
        await this.backendIdSandboxResolver(options.identifier),
        options.functionStreamingOptions,
      );
    });

    if (watchForChanges) {
      this.watcherSubscription = await this.subscribe(
        watchDir,
        async (_, events) => {
          // Log and track file changes.
          await Promise.all(
            events.map(async ({ type: eventName, path: filePath }) => {
              this.filesChangesTracker.trackFileChange(filePath);
              if (latch === 'open') {
                this.printer.clearConsole();
                await this.printSandboxNameInfo();
              }
              this.printer.log(
                `[Sandbox] Triggered due to a file ${eventName} event: ${path.relative(
                  process.cwd(),
                  filePath,
                )}`,
              );
            }),
          );
          if (latch === 'open') {
            await deployAndWatch();
          } else {
            // this means latch is either 'deploying' or 'queued'
            latch = 'queued';
            this.printer.log(
              '[Sandbox] Previous deployment is still in progress. ' +
                'Will queue for another deployment after this one finishes',
            );
          }
        },
        {
          ignore: this.outputFilesExcludedFromWatch.concat(
            ...(options.exclude ?? []),
          ),
        },
      );
      // Start the first full deployment without waiting for a file change
      await deployAndWatch();
    } else {
      await this.deploy(options);
    }
  };

  /**
   * @inheritdoc
   */
  stop = async () => {
    this.printer.log(`[Sandbox] Stop operation initiated`, LogLevel.DEBUG);

    try {
      // Stop function log streaming
      this.functionsLogStreamer?.stopStreamingLogs();
      this.printer.log(
        `[Sandbox] Function log streaming stopped successfully`,
        LogLevel.DEBUG,
      );

      // Unsubscribe from watcher
      if (this.watcherSubscription) {
        await this.watcherSubscription.unsubscribe();
      }

      // Update state to stopped
      this.state = 'stopped';
      this.printer.log(`[Sandbox] Stop operation completed`, LogLevel.DEBUG);

      // Emit successful stop event
      this.emit('successfulStop');
    } catch (error) {
      this.printer.log(
        `[Sandbox] Error during stop operation: ${String(error)}`,
        LogLevel.ERROR,
      );

      // Emit failed stop event
      this.emit('failedStop', error);
      throw error;
    }
  };

  /**
   * @inheritdoc
   */
  delete = async (options: SandboxDeleteOptions) => {
    this.printer.log(
      '[Sandbox] Deleting all the resources in the sandbox environment...',
    );

    // Emit deletionStarted event with relevant info
    this.emit('deletionStarted', {
      identifier: options.identifier,
      timestamp: new Date().toISOString(),
    });

    try {
      const backendId = await this.backendIdSandboxResolver(options.identifier);

      await this.executor.destroy(backendId);

      // Update state to nonexistent
      this.state = 'nonexistent';

      this.emit('successfulDeletion');
      this.printer.log('[Sandbox] Finished deleting.');
    } catch (error) {
      this.printer.log(
        `[Sandbox] Error during deletion: ${String(error)}`,
        LogLevel.ERROR,
      );
      if (error instanceof Error && error.stack) {
        this.printer.log(
          `[Sandbox] Error stack: ${error.stack}`,
          LogLevel.DEBUG,
        );
      }

      // Emit failedDeletion event
      this.emit('failedDeletion', error);

      throw error;
    }
  };

  private shouldValidateAppSources = (): boolean => {
    const snapshot = this.filesChangesTracker.getAndResetSnapshot();
    // if zero files changed this indicates initial deployment
    const shouldValidateOnColdStart =
      snapshot.hadTypeScriptFilesAtStart &&
      !snapshot.didAnyFileChangeSinceStart;
    return (
      shouldValidateOnColdStart ||
      snapshot.didAnyTypeScriptFileChangeSinceLastSnapshot
    );
  };

  private deploy = async (options: SandboxOptions) => {
    const tracer = openTelemetryTrace.getTracer('amplify-backend');
    await tracer.startActiveSpan('sandbox', async (span: Span) => {
      const startTime = Date.now();
      try {
        // Set state to deploying
        this.state = 'deploying';

        // Emit deploymentStarted event with relevant info
        this.emit('deploymentStarted', {
          identifier: options.identifier,
          timestamp: new Date().toISOString(),
        });

        const deployResult = await this.executor.deploy(
          await this.backendIdSandboxResolver(options.identifier),
          this.shouldValidateAppSources,
        );
        const data: DeepPartial<TelemetryPayload> = {
          latency: {
            total: deployResult.deploymentTimes.totalTime
              ? deployResult.deploymentTimes.totalTime * 1000
              : 0,
            synthesis: deployResult.deploymentTimes.synthesisTime
              ? deployResult.deploymentTimes.synthesisTime * 1000
              : 0,
          },
          event: {
            state: 'SUCCEEDED',
            command: {
              path: ['SandboxDeployment'],
              parameters: [],
            },
          },
        };
        setSpanAttributes(span, data);
        span.end();

        this.printer.log('[Sandbox] Deployment successful', LogLevel.DEBUG);

        // Set state based on watchForChanges option
        if (options.watchForChanges === false) {
          // If --once flag was used, set state to stopped
          this.state = 'stopped';
        } else {
          // Otherwise set state to running
          this.state = 'running';
        }
        this.emit('successfulDeployment', deployResult);
      } catch (error) {
        const amplifyError = AmplifyError.isAmplifyError(error)
          ? error
          : AmplifyError.fromError(error);
        const data: DeepPartial<TelemetryPayload> = {
          latency: {
            total: Date.now() - startTime,
          },
          event: {
            state: 'FAILED',
            command: {
              path: ['SandboxDeployment'],
              parameters: [],
            },
          },
          error: translateErrorToTelemetryErrorDetails(amplifyError),
        };
        setSpanAttributes(span, data);
        span.end();
        // Print a meaningful message
        this.printer.log(format.error(amplifyError), LogLevel.ERROR);

        // Print stack traces
        let errorToDisplayStackTrace: Error | undefined = amplifyError;
        while (errorToDisplayStackTrace) {
          if (errorToDisplayStackTrace.stack) {
            this.printer.log(
              `Stack Trace for ${errorToDisplayStackTrace.name}`,
              LogLevel.DEBUG,
            );
            this.printer.log(
              format.dim(errorToDisplayStackTrace.stack),
              LogLevel.DEBUG,
            );
          }
          errorToDisplayStackTrace =
            errorToDisplayStackTrace.cause instanceof Error
              ? errorToDisplayStackTrace.cause
              : undefined;
        }

        this.emit('failedDeployment', error);

        // If the error is because of a non-allowed destructive change such as
        // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cognito-userpool.html#cfn-cognito-userpool-aliasattributes
        // offer to recreate the sandbox or revert the change
        if (
          AmplifyError.isAmplifyError(error) &&
          error.name === 'CFNUpdateNotSupportedError'
        ) {
          await this.handleUnsupportedDestructiveChanges(options);
        }
        // else do not propagate and let the sandbox continue to run
      }
    });
  };

  private reset = async (options: SandboxOptions) => {
    await this.delete({ identifier: options.identifier });
    await this.start(options);
  };

  /**
   * Just a shorthand console log to indicate whenever watcher is going idle
   */
  private emitWatching = () => {
    this.printer.log(`[Sandbox] Watching for file changes...`);
  };

  /**
   * Reads and parses .gitignore file and returns the list of paths
   */
  private getGitIgnoredPaths = () => {
    const gitIgnoreFilePath = path.join(process.cwd(), '.gitignore');
    if (fs.existsSync(gitIgnoreFilePath)) {
      return parseGitIgnore
        .parse(gitIgnoreFilePath)
        .patterns.map((pattern: string) =>
          pattern.startsWith('/') ? pattern.substring(1) : pattern,
        )
        .filter((pattern: string) => {
          if (pattern.startsWith('!')) {
            this.printer.log(
              `[Sandbox] Pattern ${pattern} found in .gitignore. "${pattern.substring(
                1,
              )}" will not be watched if other patterns in .gitignore are excluding it.`,
            );
            return false;
          }
          return true;
        });
    }
    return [];
  };

  /**
   * Checks if a given region has been bootstrapped with >= min version using CDK bootstrap version parameter
   * stored in parameter store.
   * @returns A Boolean that represents if region has been bootstrapped.
   */
  private isBootstrapped = async () => {
    try {
      const { Parameter: parameter } = await this.ssmClient.send(
        new GetParameterCommand({
          Name: CDK_DEFAULT_BOOTSTRAP_VERSION_PARAMETER_NAME,
        }),
      );

      const bootstrapVersion = parameter?.Value;
      if (
        !bootstrapVersion ||
        Number(bootstrapVersion) < CDK_MIN_BOOTSTRAP_VERSION
      ) {
        return false;
      }
      return true;
    } catch (e) {
      if (e instanceof ParameterNotFound) {
        return false;
      }
      if (
        e instanceof SSMServiceException &&
        [
          'UnrecognizedClientException',
          'AccessDeniedException',
          'NotAuthorized',
          'ExpiredTokenException',
          'ExpiredToken',
          'InvalidSignatureException',
        ].includes(e.name)
      ) {
        throw new AmplifyUserError(
          'SSMCredentialsError',
          {
            message: `${e.name}: ${e.message}`,
            resolution:
              'Make sure your AWS credentials are set up correctly and have permissions to call SSM:GetParameter',
          },
          e,
        );
      }

      // If we are unable to retrieve bootstrap version parameter due to other reasons, we fail fast.
      throw e;
    }
  };

  private handleUnsupportedDestructiveChanges = async (
    options: SandboxOptions,
  ) => {
    this.printer.print(
      format.error(
        '[Sandbox] We cannot deploy your new changes. You can either revert them or recreate your sandbox with the new changes (deleting all user data)',
      ),
    );
    // offer to recreate the sandbox with new properties
    const answer = await AmplifyPrompter.yesOrNo({
      message:
        'Would you like to recreate your sandbox (deleting all user data)?',
      defaultValue: false,
    });
    if (answer) {
      await this.stop();
      await this.reset(options);
    }
    // else let the sandbox continue so customers can revert their changes
  };

  private printSandboxNameInfo = async (sandboxIdentifier?: string) => {
    const sandboxBackendId =
      await this.backendIdSandboxResolver(sandboxIdentifier);
    const stackName =
      BackendIdentifierConversions.toStackName(sandboxBackendId);
    const region = await this.ssmClient.config.region();
    this.printer.print(
      format.indent(format.highlight(format.bold('\nAmplify Sandbox\n'))),
    );
    this.printer.print(
      format.indent(`${format.bold('Identifier:')} \t${sandboxBackendId.name}`),
    );
    this.printer.print(
      format.indent(`${format.bold('Stack:')} \t${stackName}`),
    );
    this.printer.print(format.indent(`${format.bold('Region:')} \t${region}`));
    if (!sandboxIdentifier) {
      this.printer.print(
        `${format.indent(
          format.dim('\nTo specify a different sandbox identifier, use '),
        )}${format.bold('--identifier')}`,
      );
    }
    this.printer.printNewLine();
  };

  /**
   * Hack to suppress certain stderr messages until aws-cdk constructs
   * can use the toolkit's IoHost to deliver messages.
   * See tracking items https://github.com/aws/aws-cdk-cli/issues/158
   *
   * Rest of the stderr messages are rerouted to our printer so that they
   * don't get intermingled with spinners.
   */
  private interceptStderr = () => {
    process.stderr.write = (chunk) => {
      if (
        typeof chunk !== 'string' ||
        !['Bundling asset'].some((prohibitedStrings) =>
          chunk.includes(prohibitedStrings),
        )
      ) {
        this.printer.log(
          typeof chunk === 'string' ? chunk : chunk.toLocaleString(),
        );
      }
      return true;
    };
  };
}
