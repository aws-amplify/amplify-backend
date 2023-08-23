import { FileWatchingSandbox } from './file_watching_sandbox.js';
import { Sandbox } from './sandbox.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ClientConfigGeneratorAdapter } from './config/client_config_generator_adapter.js';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import { AmplifySandboxExecutor } from './sandbox_executor.js';

/**
 * Factory to create a new sandbox
 */
export class SandboxSingletonFactory {
  private instance: Sandbox | undefined;
  private readonly clientConfigGenerator: ClientConfigGeneratorAdapter;
  /**
   * Initialize with an sandboxIdResolver.
   * This resolver will be called once and only once the first time getInstance() is called.
   * After that, the cached Sandbox instance is returned.
   */
  constructor(private readonly sandboxIdResolver: () => Promise<string>) {
    this.clientConfigGenerator = new ClientConfigGeneratorAdapter(
      fromNodeProviderChain()
    );
  }

  /**
   * Returns a singleton instance of a Sandbox
   */
  async getInstance(): Promise<Sandbox> {
    if (!this.instance) {
      this.instance = new FileWatchingSandbox(
        await this.sandboxIdResolver(),
        this.clientConfigGenerator,
        new AmplifySandboxExecutor(BackendDeployerFactory.getInstance())
      );
    }
    return this.instance;
  }
}
