import { SandboxEventHandlerCreator } from './sandbox_command.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { AmplifyError, UsageDataEmitter } from '@aws-amplify/platform-core';
import { DeployResult } from '@aws-amplify/backend-deployer';
import { format, printer } from '@aws-amplify/cli-core';

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
    private readonly getUsageDataEmitter: () => Promise<UsageDataEmitter>
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
          const usageDataEmitter = await this.getUsageDataEmitter();
          try {
            await clientConfigLifecycleHandler.generateClientConfigFile(
              backendIdentifier
            );
            if (args && args[0]) {
              const deployResult = args[0] as DeployResult;
              if (deployResult && deployResult.deploymentTimes) {
                await usageDataEmitter.emitSuccess(
                  deployResult.deploymentTimes,
                  { command: 'Sandbox' }
                );
              }
            }
          } catch (error) {
            // Don't crash sandbox if config cannot be generated, but print the error message
            printer.print(
              format.error('Amplify configuration could not be generated.')
            );
            if (error instanceof Error) {
              printer.print(format.error(error.message));
            } else {
              try {
                printer.print(format.error(JSON.stringify(error, null, 2)));
              } catch {
                // fallback in case there's an error stringify the error
                // like with circular references.
                printer.print(format.error('Unknown error'));
              }
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
          const usageDataEmitter = await this.getUsageDataEmitter();
          if (args.length == 0 || !args[0]) {
            return;
          }
          const deployError = args[0];
          if (deployError && deployError instanceof AmplifyError) {
            await usageDataEmitter.emitFailure(deployError, {
              command: 'Sandbox',
            });
          } else {
            await usageDataEmitter.emitFailure(
              AmplifyError.fromError(deployError),
              {
                command: 'Sandbox',
              }
            );
          }
        },
      ],
    };
  };
}
