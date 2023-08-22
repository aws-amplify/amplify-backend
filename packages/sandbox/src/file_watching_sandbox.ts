import debounce from 'debounce-promise';
import parcelWatcher, { subscribe } from '@parcel/watcher';
import { InvokableCommand } from '@aws-amplify/backend-deployer';
import { AmplifySandboxExecutor } from './sandbox_executor.js';
import { Sandbox, SandboxDeleteOptions, SandboxOptions } from './sandbox.js';
import { ClientConfigGeneratorAdapter } from './config/client_config_generator_adapter.js';
import path from 'path';

/**
 * Runs a file watcher and deploys
 */
export class FileWatchingSandbox implements Sandbox {
  private watcherSubscription: Awaited<ReturnType<typeof subscribe>>;
  private outputFilesExcludedFromWatch = ['cdk.out'];
  /**
   * Creates a watcher process for this instance
   */
  constructor(
    private readonly sandboxId: string,
    private readonly clientConfigGenerator: ClientConfigGeneratorAdapter,
    private readonly executor: AmplifySandboxExecutor
  ) {
    process.once('SIGINT', this.stop.bind(this));
    process.once('SIGTERM', this.stop.bind(this));
  }

  /**
   * @inheritdoc
   */
  async start(options: SandboxOptions) {
    const sandboxId = options.name ?? this.sandboxId;
    let clientConfigWritePath = path.join(
      process.cwd(),
      'amplifyconfiguration.js'
    );
    if (options.clientConfigFilePath) {
      if (path.isAbsolute(options.clientConfigFilePath)) {
        clientConfigWritePath = options.clientConfigFilePath;
      } else {
        clientConfigWritePath = path.resolve(
          process.cwd(),
          options.clientConfigFilePath
        );
      }
    }
    this.outputFilesExcludedFromWatch =
      this.outputFilesExcludedFromWatch.concat(clientConfigWritePath);

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
      await this.executor.invokeWithDebounce(InvokableCommand.DEPLOY, {
        backendId: sandboxId,
        branchName: 'sandbox',
      });
      await this.writeUpdatedClientConfig(sandboxId, clientConfigWritePath);

      // If latch is still 'deploying' after the 'await', that's fine,
      // but if it's 'queued', that means we need to deploy again
      while ((latch as 'deploying' | 'queued') === 'queued') {
        // TypeScript doesn't realize latch can change between 'awaits' ¯\_(ツ)_/¯,
        // and thinks the above 'while' condition is always 'false' without the cast
        latch = 'deploying';
        console.log(
          "[Sandbox] Detected file changes while previous deployment was in progress. Invoking 'sandbox' again"
        );
        await this.executor.invokeWithDebounce(InvokableCommand.DEPLOY, {
          backendId: sandboxId,
          branchName: 'sandbox',
        });
        await this.writeUpdatedClientConfig(sandboxId, clientConfigWritePath);
      }
      latch = 'open';
      this.emitWatching();
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
  }

  /**
   * @inheritdoc
   */
  async stop() {
    console.debug(`[Sandbox] Shutting down`);
    await this.watcherSubscription.unsubscribe();
  }

  /**
   * @inheritdoc
   */
  async delete(options: SandboxDeleteOptions) {
    const sandboxAppId = options.name ?? this.sandboxId;
    console.log(
      '[Sandbox] Deleting all the resources in the sandbox environment...'
    );
    await this.executor.invokeWithDebounce(InvokableCommand.DESTROY, {
      backendId: sandboxAppId,
      branchName: 'sandbox',
    });
    console.log('[Sandbox] Finished deleting.');
  }

  /**
   * Runs post every deployment. Generates the client config and writes to a local file
   * @param sandboxId for this sandbox execution. Either package.json#name + whoami or provided by user during `amplify sandbox`
   * @param outputPath optional location provided by customer to write client config to
   */
  private async writeUpdatedClientConfig(
    sandboxId: string,
    outputPath: string
  ) {
    await this.clientConfigGenerator.generateClientConfigToFile(
      {
        backendId: sandboxId,
        branchName: 'sandbox',
      },
      outputPath
    );
  }

  /**
   * Just a shorthand console log to indicate whenever watcher is going idle
   */
  private emitWatching() {
    console.log(`[Sandbox] Watching for file changes...`);
  }
}
