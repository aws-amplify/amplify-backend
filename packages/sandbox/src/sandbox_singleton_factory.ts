import { FileWatchingSandbox } from './file_watching_sandbox.js';
import { Sandbox } from './sandbox.js';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import { AmplifySandboxExecutor } from './sandbox_executor.js';

/**
 * Factory to create a new sandbox
 */
export class SandboxSingletonFactory {
  private instance: Sandbox | undefined;
  /**
   * Initialize with an sandboxIdResolver.
   * This resolver will be called once and only once the first time getInstance() is called.
   * After that, the cached Sandbox instance is returned.
   */
  constructor(private readonly sandboxIdResolver: () => Promise<string>) {}

  /**
   * Returns a singleton instance of a Sandbox
   */
  getInstance = async (): Promise<Sandbox> => {
    if (!this.instance) {
      this.instance = new FileWatchingSandbox(
        await this.sandboxIdResolver(),
        new AmplifySandboxExecutor(BackendDeployerFactory.getInstance())
      );
    }
    return this.instance;
  };
}
