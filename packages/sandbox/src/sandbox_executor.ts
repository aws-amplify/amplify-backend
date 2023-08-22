import debounce from 'debounce-promise';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import {
  InvokableCommand,
  BackendDeployer,
} from '@aws-amplify/backend-deployer';
/**
 * Execute CDK commands.
 */
export class AmplifySandboxExecutor {
  /**
   * Creates an AmplifySandboxExecutor instance
   */
  constructor(private readonly backendDeployer: BackendDeployer) {}

  /**
   * Function that deploys backend resources using CDK.
   * Debounce is added in case multiple duplicate events are received.
   */
  invokeWithDebounce = debounce(
    async (
      invokableCommand: InvokableCommand,
      uniqueBackendIdentifier?: UniqueBackendIdentifier
    ): Promise<void> => {
      console.debug(
        `[Sandbox] Executing command ${invokableCommand.toString()}`
      );

      // call execa for executing the command line
      try {
        // Sandbox deploys and destroys fast
        if (invokableCommand === InvokableCommand.DEPLOY) {
          await this.backendDeployer.deploy(uniqueBackendIdentifier, {
            hotswapFallback: true,
            method: 'direct',
          });
        } else if (invokableCommand == InvokableCommand.DESTROY) {
          await this.backendDeployer.destroy(uniqueBackendIdentifier, {
            force: true,
          });
        }
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
