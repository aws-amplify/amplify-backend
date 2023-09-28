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

export const CDK_BOOTSTRAP_STACK_NAME = 'CDKToolkit';
// TODO: finalize bootstrap url

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
  private outputFilesExcludedFromWatch = ['cdk.out'];
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
    const bootstrapped = await this.isBootstrapped();
    if (!bootstrapped) {
      console.warn(
        'The given region has not been bootstrapped. Sign in to console as a Root user or Admin to complete the bootstrap process and re-run the amplify sandbox command.'
      );
      // get region from an available sdk client;
      const region = await this.cfnClient.config.region();
      await this.open(getBootstrapUrl(region));
      return;
    }

    const sandboxId = options.name ?? this.sandboxId;
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
      await this.executor.deploy(new SandboxBackendIdentifier(sandboxId));

      // If latch is still 'deploying' after the 'await', that's fine,
      // but if it's 'queued', that means we need to deploy again
      while ((latch as 'deploying' | 'queued') === 'queued') {
        // TypeScript doesn't realize latch can change between 'awaits' ¯\_(ツ)_/¯,
        // and thinks the above 'while' condition is always 'false' without the cast
        latch = 'deploying';
        console.log(
          "[Sandbox] Detected file changes while previous deployment was in progress. Invoking 'sandbox' again"
        );
        await this.executor.deploy(new SandboxBackendIdentifier(sandboxId));
      }
      latch = 'open';
      this.emitWatching();
      console.debug('[Sandbox] Running successfulDeployment event handlers');
      this.emit('successfulDeployment');
    });

    this.watcherSubscription = await parcelWatcher.subscribe(
      options.dir ?? process.cwd(),
      async (_, events) => {
        // it doesn't matter which file changed, we are just using events to log the filenames. We deploy full state.
        await Promise.all(
          events.map(({ type: eventName, path }) => {
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
    console.log('[Sandbox] Finished deleting.');
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
   * Check if given region has been bootstrapped using CFN describeStacks with CDKToolKit.
   * @returns A Boolean that represents if region has been bootstrapped.
   */
  private isBootstrapped = async () => {
    try {
      await this.cfnClient.send(
        new DescribeStacksCommand({
          StackName: CDK_BOOTSTRAP_STACK_NAME,
        })
      );
      // TODO: Check if its possible to look for a min bootstrap version from stack output to be able to re-bootstrap CDKv1 stack
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
}
