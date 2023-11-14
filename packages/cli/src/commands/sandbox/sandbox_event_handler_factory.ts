import { SandboxEventHandlerCreator } from './sandbox_command.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { UsageDataEmitter } from '@aws-amplify/platform-core';
import { DeployResult } from '@aws-amplify/backend-deployer';

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
    ) => Promise<BackendIdentifier>,
    private readonly usageDataEmitter: UsageDataEmitter
  ) {}

  getSandboxEventHandlers: SandboxEventHandlerCreator = ({
    sandboxName,
    clientConfigLifecycleHandler,
  }) => {
    return {
      successfulDeployment: [
        async (...args: unknown[]) => {
          const backendIdentifier = await this.getBackendIdentifier(
            sandboxName
          );
          await clientConfigLifecycleHandler.generateClientConfigFile(
            backendIdentifier
          );
          if (args && args[0]) {
            const deployResult = args[0] as DeployResult;
            if (deployResult && deployResult.deploymentTimes) {
              await this.usageDataEmitter.emitSuccess(
                'Sandbox',
                deployResult.deploymentTimes,
                deployResult.hotswapped
              );
            }
          }
        },
      ],
      successfulDeletion: [
        async () => {
          await clientConfigLifecycleHandler.deleteClientConfigFile();
        },
      ],
      failedDeployment: [
        async (...args: unknown[]) => {
          if (args.length == 0 || !args[0]) {
            return;
          }
          const deployError = args[0] as Error;
          if (deployError && deployError.message) {
            await this.usageDataEmitter.emitFailure('Sandbox', deployError);
          }
        },
      ],
    };
  };
}
