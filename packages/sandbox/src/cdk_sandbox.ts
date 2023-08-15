import debounce from 'debounce-promise';
import parcelWatcher, { subscribe } from '@parcel/watcher';
import { AmplifyCDKExecutor, CDKCommand } from './cdk_executor.js';
import { Sandbox, SandboxDeleteOptions, SandboxOptions } from './sandbox.js';
import { ClientConfigGeneratorAdapter } from './config/client_config_generator_adapter.js';
import path from 'path';

/**
 * Runs a file watcher and deploys using cdk
 */
export class CDKSandbox implements Sandbox {
  private watcherSubscription: Awaited<ReturnType<typeof subscribe>>;
  private outputFilesExcludedFromWatch = ['cdk.out'];
  /**
   * Creates a watcher process for this instance
   */
  constructor(
    private readonly appName: string,
    private readonly disambiguator: string,
    private readonly clientConfigGenerator: ClientConfigGeneratorAdapter,
    private readonly cdkExecutor: AmplifyCDKExecutor = new AmplifyCDKExecutor()
  ) {
    process.once('SIGINT', this.stop.bind(this));
    process.once('SIGTERM', this.stop.bind(this));
  }

  /**
   * @inheritdoc
   */
  async start(options: SandboxOptions) {
    const sandboxAppName = options.name ?? this.appName;
    const clientConfigWritePath = path.resolve(
      process.cwd(),
      options.relativeClientConfigFilePath ?? 'amplifyconfiguration.js'
    );
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
      await this.cdkExecutor.invokeCDKWithDebounce(CDKCommand.DEPLOY, {
        appName: sandboxAppName,
        branchName: 'sandbox',
        disambiguator: this.disambiguator,
      });
      await this.writeUpdatedClientConfig(
        sandboxAppName,
        clientConfigWritePath
      );

      // If latch is still 'deploying' after the 'await', that's fine,
      // but if it's 'queued', that means we need to deploy again
      while ((latch as 'deploying' | 'queued') === 'queued') {
        // TypeScript doesn't realize latch can change between 'awaits' ¯\_(ツ)_/¯,
        // and thinks the above 'while' condition is always 'false' without the cast
        latch = 'deploying';
        console.log(
          "[Sandbox] Detected file changes while previous deployment was in progress. Invoking 'sandbox' again"
        );
        await this.cdkExecutor.invokeCDKWithDebounce(CDKCommand.DEPLOY, {
          appName: sandboxAppName,
          branchName: 'sandbox',
          disambiguator: this.disambiguator,
        });
        await this.writeUpdatedClientConfig(
          sandboxAppName,
          clientConfigWritePath
        );
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
    const sandboxAppName = options.name ?? this.appName;
    console.log(
      '[Sandbox] Deleting all the resources in the sandbox environment...'
    );
    await this.cdkExecutor.invokeCDKWithDebounce(CDKCommand.DESTROY, {
      appName: sandboxAppName,
      branchName: 'sandbox',
      disambiguator: this.disambiguator,
    });
    console.log('[Sandbox] Finished deleting.');
  }

  /**
   * Runs post every deployment. Generates the client config and writes to a local file
   * @param appName AppName for this sandbox execution. Either package.json#name or provided by user during `amplify sandbox`
   * @param outputPath optional location provided by customer to write client config to
   */
  private async writeUpdatedClientConfig(appName: string, outputPath: string) {
    await this.clientConfigGenerator.generateClientConfigToFile(
      {
        appName,
        branchName: 'sandbox',
        disambiguator: this.disambiguator,
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
