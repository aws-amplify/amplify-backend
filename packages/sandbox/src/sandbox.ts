import debounce from 'debounce-promise';
import parcelWatcher, { subscribe } from '@parcel/watcher';
import child_process from 'node:child_process';
import util from 'node:util';

/**
 * Main class for Sandbox. Runs a file watcher and deploys using cdk
 */
export class Sandbox {
  private readonly watchProcess: SandboxWatchProcess;

  /**
   * Creates a watcher process for this instance
   */
  constructor() {
    this.watchProcess = this.createWatchProcess();
    process.once('SIGINT', this.watchProcess.stop);
    process.once('SIGTERM', this.watchProcess.stop);
  }

  /**
   * Starts the sandbox
   */
  public async start() {
    await this.watchProcess.start();
  }

  /**
   * Stops watching for file changes
   */
  public async stop() {
    await this.watchProcess.stop();
  }

  /**
   * Creates a file watcher and subscribes file change events to invoke cdk deploy
   */
  private createWatchProcess(): SandboxWatchProcess {
    console.debug(`[Sandbox] Initializing...`);

    let watcherSubscription: Awaited<ReturnType<typeof subscribe>>;
    const watchProcess = {
      start: async () => {
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
          await this.invokeCDKDeployWithDebounce();

          // If latch is still 'deploying' after the 'await', that's fine,
          // but if it's 'queued', that means we need to deploy again
          while ((latch as 'deploying' | 'queued') === 'queued') {
            // TypeScript doesn't realize latch can change between 'awaits' ¯\_(ツ)_/¯,
            // and thinks the above 'while' condition is always 'false' without the cast
            latch = 'deploying';
            console.log(
              "[Sandbox] Detected file changes while previous deployment was in progress. Invoking 'sandbox' again"
            );
            await this.invokeCDKDeployWithDebounce();
          }
          latch = 'open';
          this.emitWatching();
        });

        watcherSubscription = await parcelWatcher.subscribe(
          process.cwd(),
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
          { ignore: ['cdk.out'] }
        );

        this.emitWatching();
      },
      stop: async () => {
        console.debug(`[Sandbox] Shutting down`);
        await watcherSubscription.unsubscribe();
      },
    };
    return watchProcess;
  }

  /**
   * Function that deploys backend resources using CDK.
   * Debounce is added in case multiple duplicate events are received.
   */
  private invokeCDKDeployWithDebounce = debounce(async (): Promise<void> => {
    const execPromisified = util.promisify(child_process.execFile);

    console.debug(`[Sandbox] Executing cdk deploy`);
    const { stdout, stderr } = await execPromisified(
      'npx cdk',
      [
        'deploy',
        '--app',
        "'npx tsx index.ts'",
        '--hotswap-fallback',
        '--method=direct',
      ],
      { shell: true }
    );

    if (stderr) {
      console.error(stderr);
    }
    console.log(stdout);
  }, 100);

  /**
   * Just a shorthand console log to indicate whenever watcher is going idle
   */
  private emitWatching() {
    console.log(`[Sandbox] Watching for changes...`);
  }
}

type SandboxWatchProcess = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
};
