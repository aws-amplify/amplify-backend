import { SandboxEventHandlerCreator } from './sandbox_command.js';
import { BackendIdentifierParts } from '@aws-amplify/plugin-types';

/**
 * Coordinates creation of sandbox event handlers
 */
export class SandboxEventHandlerFactory {
  /**
   * Creates a SandboxEventHandlerFactory
   */
  constructor(
    private readonly getBackendIdentifier: (
      sandboxName?: string
    ) => Promise<BackendIdentifierParts>
  ) {}
  getSandboxEventHandlers: SandboxEventHandlerCreator = ({
    sandboxName,
    clientConfigLifecycleHandler,
  }) => {
    return {
      successfulDeployment: [
        async () => {
          const backendIdentifier = await this.getBackendIdentifier(
            sandboxName
          );
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
