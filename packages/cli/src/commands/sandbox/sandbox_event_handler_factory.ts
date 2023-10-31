import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';
import { SandboxEventHandlerCreator } from './sandbox_command.js';

/**
 * Coordinates creation of sandbox event handlers
 */
export class SandboxEventHandlerFactory {
  /**
   * Creates a SandboxEventHandlerFactory
   */
  constructor(
    private getBackendIdentifier: (
      appName?: string
    ) => Promise<SandboxBackendIdentifier>
  ) {}
  getSandboxEventHandlers: SandboxEventHandlerCreator = ({
    appName,
    clientConfigLifecycleHandler,
  }) => {
    return {
      successfulDeployment: [
        async () => {
          const backendIdentifier = await this.getBackendIdentifier(appName);
          await clientConfigLifecycleHandler.generateClientConfigFile(
            backendIdentifier
          );
        },
      ],
      successfulDeletion: [
        async () => {
          await clientConfigLifecycleHandler.deleteClientConfigFile();
        },
      ],
    };
  };
}
