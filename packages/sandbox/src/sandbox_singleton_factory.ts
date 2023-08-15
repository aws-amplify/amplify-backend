import { CDKSandbox } from './cdk_sandbox.js';
import { Sandbox } from './sandbox.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ClientConfigGeneratorAdapter } from './config/client_config_generator_adapter.js';
import { ClientConfigWriter } from '@aws-amplify/client-config';

/**
 * Factory to create a new sandbox
 */
export class SandboxSingletonFactory {
  private instance: Sandbox | undefined;
  private clientConfigGenerator: ClientConfigGeneratorAdapter;
  /**
   * Initialize with an appNameResolver and a disambiguatorResolver.
   * These resolvers will be called once and only once the first time getInstance() is called.
   * After that, the cached Sandbox instance is returned.
   */
  constructor(
    private readonly appNameResolver: () => Promise<string>,
    private readonly disambiguatorResolver: () => Promise<string>
  ) {
    this.clientConfigGenerator = new ClientConfigGeneratorAdapter(
      fromNodeProviderChain(),
      new ClientConfigWriter()
    );
  }

  /**
   * Returns a singleton instance of a Sandbox
   */
  async getInstance(): Promise<Sandbox> {
    if (!this.instance) {
      this.instance = new CDKSandbox(
        await this.appNameResolver(),
        await this.disambiguatorResolver(),
        this.clientConfigGenerator
      );
    }
    return this.instance;
  }
}
