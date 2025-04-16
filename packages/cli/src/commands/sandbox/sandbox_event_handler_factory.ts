import { SandboxEventHandlerCreator } from './sandbox_command.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { AmplifyError } from '@aws-amplify/platform-core';
import { format, printer } from '@aws-amplify/cli-core';
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
    private readonly noticesRenderer: NoticesRenderer,
  ) {}

  getSandboxEventHandlers: SandboxEventHandlerCreator = ({
    sandboxIdentifier: sandboxIdentifier,
    clientConfigLifecycleHandler,
  }) => {
    return {
      successfulDeployment: [
        async () => {
          const backendIdentifier =
            await this.getBackendIdentifier(sandboxIdentifier);
          try {
            await clientConfigLifecycleHandler.generateClientConfigFile(
              backendIdentifier,
            );
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
          if (args.length == 0 || !args[0]) {
            return;
          }
          const deployError = args[0];
          if (deployError) {
            const amplifyError = AmplifyError.isAmplifyError(deployError)
              ? deployError
              : AmplifyError.fromError(deployError);
            await this.noticesRenderer.tryFindAndPrintApplicableNotices({
              event: 'postDeployment',
              error: amplifyError,
            });
          }
        },
      ],
    };
  };
}
