import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { SandboxEventHandlerCreator } from './sandbox_command.js';

/**
 * Coordinates creation of sandbox event handlers
 */
export class SandboxEventHandlerFactory {
  /**
   * Creates a SandboxEventHandlerFactory
   */
  constructor(
    private clientConfigGeneratorAdapter: ClientConfigGeneratorAdapter,
    private getBackendIdentifier: (
      appName?: string
    ) => Promise<SandboxBackendIdentifier>
  ) {}
  getSandboxEventHandlers: SandboxEventHandlerCreator = ({
    appName,
    clientConfigOutDir,
    format,
  }) => {
    return {
      successfulDeployment: [
        async () => {
          const backendIdentifier = await this.getBackendIdentifier(appName);
          await this.clientConfigGeneratorAdapter.generateClientConfigToFile(
            backendIdentifier,
            clientConfigOutDir,
            format
          );
        },
      ],
      sandboxDeleted: [
        async () => {
          await this.clientConfigGeneratorAdapter.deleteClientConfigFile(
            clientConfigOutDir,
            format
          );
        },
      ],
    };
  };
}
