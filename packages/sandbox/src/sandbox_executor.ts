import debounce from 'debounce-promise';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-core';
import { BackendDeployer } from '@aws-amplify/backend-deployer';

/**
 * Execute CDK commands.
 */
export class AmplifySandboxExecutor {
  /**
   * Creates an AmplifySandboxExecutor instance
   */
  constructor(private readonly backendDeployer: BackendDeployer) {}

  /**
   * Deploys sandbox
   */
  deploy = (
    uniqueBackendIdentifier?: UniqueBackendIdentifier
  ): Promise<void> => {
    console.debug('[Sandbox] Executing command `deploy`');
    return this.invoke(() =>
      this.backendDeployer.deploy(uniqueBackendIdentifier, {
        hotswapFallback: true,
        method: 'direct',
      })
    );
  };

  /**
   * Destroy sandbox
   */
  destroy = (
    uniqueBackendIdentifier?: UniqueBackendIdentifier
  ): Promise<void> => {
    console.debug('[Sandbox] Executing command `deploy`');
    return this.invoke(() =>
      this.backendDeployer.destroy(uniqueBackendIdentifier)
    );
  };

  /**
   * Function that deploys/destroys backend resources
   * Debounce is added in case multiple duplicate events are received.
   */
  private invoke = debounce(
    async (callback: () => Promise<void>): Promise<void> => {
      try {
        await callback();
      } catch (error) {
        let message;
        if (error instanceof Error) message = error.message;
        else message = String(error);
        console.log(message);
        // do not propagate and let the sandbox continue to run
      }
    },
    100
  );
}
