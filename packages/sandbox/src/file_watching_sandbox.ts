import debounce from 'debounce-promise';
import parcelWatcher, { subscribe } from '@parcel/watcher';
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
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
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
} from '@aws-amplify/platform-core';

export const CDK_BOOTSTRAP_STACK_NAME = 'CDKToolkit';
export const CDK_BOOTSTRAP_VERSION_KEY = 'BootstrapVersion';
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
  private watcherSubscription: Awaited<ReturnType<typeof subscribe>>;
  private outputFilesExcludedFromWatch = ['.amplify'];
  private filesChangesTracker: FilesChangesTracker;

  /**
   * Creates a watcher process for this instance
   */
  constructor(
    private readonly backendIdSandboxResolver: BackendIdSandboxResolver,
    private readonly executor: AmplifySandboxExecutor,
    private readonly cfnClient: CloudFormationClient,
    private readonly printer: Printer,
    private readonly open = _open
  ) {
    process.once('SIGINT', () => void this.stop());
    process.once('SIGTERM', () => void this.stop());
    super();
  }

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
    listener: (...args: unknown[]) => void
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

    this.filesChangesTracker = await createFilesChangesTracker(watchDir);
    const bootstrapped = await this.isBootstrapped();
    if (!bootstrapped) {
      this.printer.log(
        'The given region has not been bootstrapped. Sign in to console as a Root user or Admin to complete the bootstrap process and re-run the amplify sandbox command.'
      );
      // get region from an available sdk client;
      const region = await this.cfnClient.config.region();
      await this.open(getBootstrapUrl(region));
      return;
    }

    const ignoredPaths = this.getGitIgnoredPaths();
    this.outputFilesExcludedFromWatch =
      this.outputFilesExcludedFromWatch.concat(...ignoredPaths);

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
      await this.deploy(options);

      // If latch is still 'deploying' after the 'await', that's fine,
      // but if it's 'queued', that means we need to deploy again
      while ((latch as 'deploying' | 'queued') === 'queued') {
        // TypeScript doesn't realize latch can change between 'awaits' ¯\_(ツ)_/¯,
        // and thinks the above 'while' condition is always 'false' without the cast
        latch = 'deploying';
        this.printer.log(
          "[Sandbox] Detected file changes while previous deployment was in progress. Invoking 'sandbox' again"
        );
        await this.deploy(options);
      }
      latch = 'open';
      this.emitWatching();
    });

    if (watchForChanges) {
      this.watcherSubscription = await parcelWatcher.subscribe(
        watchDir,
        async (_, events) => {
          // Log and track file changes.
          await Promise.all(
            events.map(({ type: eventName, path }) => {
              this.filesChangesTracker.trackFileChange(path);
              this.printer.log(
                `[Sandbox] Triggered due to a file ${eventName} event: ${path}`
              );
            })
          );
          if (latch === 'open') {
            await deployAndWatch();
          } else {
            // this means latch is either 'deploying' or 'queued'
            latch = 'queued';
            this.printer.log(
              '[Sandbox] Previous deployment is still in progress. ' +
                'Will queue for another deployment after this one finishes'
            );
          }
        },
        {
          ignore: this.outputFilesExcludedFromWatch.concat(
            ...(options.exclude ?? [])
          ),
        }
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
    this.printer.log(`[Sandbox] Shutting down`, LogLevel.DEBUG);
    // can be undefined if command exits before subscription
    await this.watcherSubscription?.unsubscribe();
  };

  /**
   * @inheritdoc
   */
  delete = async (options: SandboxDeleteOptions) => {
    this.printer.log(
      '[Sandbox] Deleting all the resources in the sandbox environment...'
    );
    await this.executor.destroy(
      await this.backendIdSandboxResolver(options.identifier)
    );
    this.emit('successfulDeletion');
    this.printer.log('[Sandbox] Finished deleting.');
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
    try {
      const deployResult = await this.executor.deploy(
        await this.backendIdSandboxResolver(options.identifier),
        // It's important to pass this as callback so that debounce does
        // not reset tracker prematurely
        this.shouldValidateAppSources
      );
      this.printer.log('[Sandbox] Deployment successful', LogLevel.DEBUG);
      this.emit('successfulDeployment', deployResult);
    } catch (error) {
      // Print a meaningful message
      this.printer.print(format.error(this.getErrorMessage(error)));
      this.emit('failedDeployment', error);

      // If the error is because of a non-allowed destructive change such as
      // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cognito-userpool.html#cfn-cognito-userpool-aliasattributes
      // offer to recreate the sandbox or revert the change
      if (
        error instanceof AmplifyError &&
        error.name === 'CFNUpdateNotSupportedError'
      ) {
        await this.handleUnsupportedDestructiveChanges(options);
      }
      // else do not propagate and let the sandbox continue to run
    }
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
          pattern.startsWith('/') ? pattern.substring(1) : pattern
        )
        .filter((pattern: string) => {
          if (pattern.startsWith('!')) {
            this.printer.log(
              `[Sandbox] Pattern ${pattern} found in .gitignore. "${pattern.substring(
                1
              )}" will not be watched if other patterns in .gitignore are excluding it.`
            );
            return false;
          }
          return true;
        });
    }
    return [];
  };

  /**
   * Checks if a given region has been bootstrapped with >= min version using CFN describeStacks with CDKToolKit.
   * @returns A Boolean that represents if region has been bootstrapped.
   */
  private isBootstrapped = async () => {
    try {
      const { Stacks: stacks } = await this.cfnClient.send(
        new DescribeStacksCommand({
          StackName: CDK_BOOTSTRAP_STACK_NAME,
        })
      );
      const bootstrapVersion = stacks?.[0]?.Outputs?.find(
        (output) => output.OutputKey === CDK_BOOTSTRAP_VERSION_KEY
      )?.OutputValue;
      if (
        !bootstrapVersion ||
        Number(bootstrapVersion) < CDK_MIN_BOOTSTRAP_VERSION
      ) {
        return false;
      }
      return true;
    } catch (e) {
      if (
        e &&
        typeof e === 'object' &&
        'message' in e &&
        typeof e.message === 'string' &&
        e.message.includes('does not exist')
      ) {
        return false;
      }
      // If we are unable to get the stack info due to other reasons(AccessDenied), we fail fast.
      throw e;
    }
  };

  /**
   * Generates a printable error message from the thrown error
   */
  private getErrorMessage = (error: unknown) => {
    let message;
    if (error instanceof Error) {
      message = error.message;

      // Add the downstream exception
      if (error.cause && error.cause instanceof Error && error.cause.message) {
        message = `${message}\nCaused By: ${error.cause.message}\n`;
      }

      if (error instanceof AmplifyError && error.resolution) {
        message = `${message}\nResolution: ${error.resolution}\n`;
      }
    } else message = String(error);
    return message;
  };

  private handleUnsupportedDestructiveChanges = async (
    options: SandboxOptions
  ) => {
    this.printer.print(
      format.error(
        '[Sandbox] We cannot deploy your new changes. You can either revert them or recreate your sandbox with the new changes (deleting all user data)'
      )
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
    const sandboxBackendId = await this.backendIdSandboxResolver(
      sandboxIdentifier
    );
    const stackName =
      BackendIdentifierConversions.toStackName(sandboxBackendId);
    this.printer.log(
      format.indent(format.highlight(format.bold('\nAmplify Sandbox\n')))
    );
    this.printer.log(
      format.indent(`${format.bold('Identifier:')} \t${sandboxBackendId.name}`)
    );
    this.printer.log(format.indent(`${format.bold('Stack:')} \t${stackName}`));
    if (!sandboxIdentifier) {
      this.printer.log(
        `${format.indent(
          format.dim('\nTo specify a different sandbox identifier, use ')
        )}${format.bold('--identifier')}`
      );
    }
  };
}
