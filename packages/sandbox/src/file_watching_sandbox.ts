import debounce from 'debounce-promise';
import parcelWatcher, { subscribe } from '@parcel/watcher';
import { AmplifySandboxExecutor } from './sandbox_executor.js';
import {
  Sandbox,
  SandboxDeleteOptions,
  SandboxEvents,
  SandboxOptions,
} from './sandbox.js';
import parseGitIgnore from 'parse-gitignore';
import path from 'path';
import fs from 'fs';
import _open from 'open';
import EventEmitter from 'events';
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import {
  FilesChangesTracker,
  createFilesChangesTracker,
} from './files_changes_tracker.js';

export const CDK_BOOTSTRAP_STACK_NAME = 'CDKToolkit';
export const CDK_BOOTSTRAP_VERSION_KEY = 'BootstrapVersion';
export const CDK_MIN_BOOTSTRAP_VERSION = 6;

// TODO: finalize bootstrap url: https://github.com/aws-amplify/samsara-cli/issues/338
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
    private readonly sandboxId: string,
    private readonly executor: AmplifySandboxExecutor,
    private readonly cfnClient: CloudFormationClient,
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
    return super.emit(eventName, args);
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
    this.filesChangesTracker = await createFilesChangesTracker(
      options.dir ?? './amplify'
    );
    const bootstrapped = await this.isBootstrapped();
    if (!bootstrapped) {
      console.log(
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

    console.debug(`[Sandbox] Initializing...`);
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
        console.log(
          "[Sandbox] Detected file changes while previous deployment was in progress. Invoking 'sandbox' again"
        );
        await this.deploy(options);
      }
      latch = 'open';
      this.emitWatching();
    });

    this.watcherSubscription = await parcelWatcher.subscribe(
      options.dir ?? './amplify',
      async (_, events) => {
        // Log and track file changes.
        await Promise.all(
          events.map(({ type: eventName, path }) => {
            this.filesChangesTracker.trackFileChange(path);
            console.log(
              `[Sandbox] Triggered due to a file ${eventName} event: ${path}`
            );
          })
        );
        if (latch === 'open') {
          await deployAndWatch();
        } else {
          // this means latch is either 'deploying' or 'queued'
          latch = 'queued';
          console.log(
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
  };

  /**
   * @inheritdoc
   */
  stop = async () => {
    console.debug(`[Sandbox] Shutting down`);
    // can be undefined if command exits before subscription
    await this.watcherSubscription?.unsubscribe();
  };

  /**
   * @inheritdoc
   */
  delete = async (options: SandboxDeleteOptions) => {
    const sandboxAppId = options.name ?? this.sandboxId;
    console.log(
      '[Sandbox] Deleting all the resources in the sandbox environment...'
    );
    await this.executor.destroy(new SandboxBackendIdentifier(sandboxAppId));
    this.emit('successfulDeletion');
    console.log('[Sandbox] Finished deleting.');
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
    const sandboxAppId = options.name ?? this.sandboxId;
    try {
      await this.executor.deploy(
        new SandboxBackendIdentifier(sandboxAppId),
        // It's important to pass this as callback so that debounce does
        // not reset tracker prematurely
        this.shouldValidateAppSources
      );
      console.debug('[Sandbox] Running successfulDeployment event handlers');
      this.emit('successfulDeployment');
    } catch (error) {
      // Print the meaningful message
      console.log(this.getErrorMessage(error));

      // If the error is because of a non-allowed destructive change such as
      // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cognito-userpool.html#cfn-cognito-userpool-aliasattributes
      // offer to recreate the sandbox or revert the change
      if (
        error instanceof Error &&
        error.message.includes('UpdateNotSupported')
      ) {
        await this.handleUnsupportedDestructiveChanges(options);
      }
      // else do not propagate and let the sandbox continue to run
    }
  };

  private reset = async (options: SandboxOptions) => {
    await this.delete({ name: options.name });
    await this.start(options);
  };

  /**
   * Just a shorthand console log to indicate whenever watcher is going idle
   */
  private emitWatching = () => {
    console.log(`[Sandbox] Watching for file changes...`);
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
        );
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
      if (error.cause && error.cause instanceof Error) {
        message = `${message}\nCaused By: ${
          error.cause instanceof Error
            ? error.cause.message
            : String(error.cause)
        }`;
      }
    } else message = String(error);
    return message;
  };

  private handleUnsupportedDestructiveChanges = async (
    options: SandboxOptions
  ) => {
    console.error(
      '[Sandbox] We cannot deploy your new changes. You can either revert them or recreate your sandbox with the new changes (deleting all user data)'
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
}
