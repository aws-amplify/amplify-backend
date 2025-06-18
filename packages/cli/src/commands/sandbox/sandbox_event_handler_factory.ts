import { SandboxEventHandlerCreator } from './sandbox_command.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { AmplifyError, UsageDataEmitter } from '@aws-amplify/platform-core';
import { DeployResult } from '@aws-amplify/backend-deployer';
import { LogLevel, format, printer } from '@aws-amplify/cli-core';
import { NoticesRenderer } from '../../notices/notices_renderer.js';

/**
 * Coordinates creation of sandbox event handlers
 */
export class SandboxEventHandlerFactory {
  /**
   * Creates a SandboxEventHandlerFactory
   */
  constructor(
    private readonly getBackendIdentifier: (
      sandboxIdentifier?: string,
    ) => Promise<BackendIdentifier>,
    private readonly getUsageDataEmitter: () => Promise<UsageDataEmitter>,
    private readonly noticesRenderer: NoticesRenderer,
  ) {}

  getSandboxEventHandlers: SandboxEventHandlerCreator = ({
    sandboxIdentifier: sandboxIdentifier,
    clientConfigLifecycleHandler,
  }) => {
    return {
      resourceConfigChanged: [
        async () => {
          try {
            // Notify that resource configuration has changed
            printer.log(
              '[Sandbox] Resource configuration changed, updating resources...',
              LogLevel.DEBUG,
            );
          } catch (error) {
            printer.print(
              `${format.error(
                'Failed to handle resource configuration change.',
              )} ${format.error(error)}`,
            );
          }
        },
      ],
      successfulDeployment: [
        async (...args: unknown[]) => {
          const backendIdentifier =
            await this.getBackendIdentifier(sandboxIdentifier);
          const usageDataEmitter = await this.getUsageDataEmitter();
          try {
            await clientConfigLifecycleHandler.generateClientConfigFile(
              backendIdentifier,
            );
            if (args && args[0]) {
              const deployResult = args[0] as DeployResult;
              if (deployResult && deployResult.deploymentTimes) {
                await usageDataEmitter.emitSuccess(
                  deployResult.deploymentTimes,
                  { command: 'Sandbox' },
                );
              }
            }
          } catch (error) {
            // Don't crash sandbox if config cannot be generated, but print the error message
            printer.print(
              `${format.error(
                'Amplify outputs could not be generated.',
              )} ${format.error(error)}`,
            );
          }
          await this.noticesRenderer.tryFindAndPrintApplicableNotices({
            event: 'postDeployment',
          });
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
          if (deployError && AmplifyError.isAmplifyError(deployError)) {
            await this.noticesRenderer.tryFindAndPrintApplicableNotices({
              event: 'postDeployment',
              error: deployError,
            });
            await usageDataEmitter.emitFailure(deployError, {
              command: 'Sandbox',
            });
          } else {
            const amplifyError = AmplifyError.fromError(deployError);
            await this.noticesRenderer.tryFindAndPrintApplicableNotices({
              event: 'postDeployment',
              error: amplifyError,
            });
            await usageDataEmitter.emitFailure(amplifyError, {
              command: 'Sandbox',
            });
          }
        },
      ],
    };
  };
}
