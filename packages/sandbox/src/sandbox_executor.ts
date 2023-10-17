import debounce from 'debounce-promise';
import { BackendDeployer } from '@aws-amplify/backend-deployer';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { BackendDeploymentType } from '@aws-amplify/platform-core';
import { SecretClient } from '@aws-amplify/backend-secret';

/**
 * Execute CDK commands.
 */
export class AmplifySandboxExecutor {
  /**
   * Creates an AmplifySandboxExecutor instance
   */
  constructor(
    private readonly backendDeployer: BackendDeployer,
    private readonly secretClient: SecretClient
  ) {}

  private getSecretLastUpdated = async (
    uniqueBackendIdentifier: UniqueBackendIdentifier
  ): Promise<Date | undefined> => {
    const secrets = await this.secretClient.listSecrets(
      uniqueBackendIdentifier
    );
    let latestTimestamp = -1;
    let secretLastUpdate: Date | undefined;

    secrets.forEach((secret) => {
      if (!secret.lastUpdated) {
        return;
      }
      const curTimeStamp = secret.lastUpdated.getTime();
      if (curTimeStamp > 0 && curTimeStamp > latestTimestamp) {
        latestTimestamp = curTimeStamp;
        secretLastUpdate = secret.lastUpdated;
      }
    });

    return secretLastUpdate;
  };

  /**
   * Deploys sandbox
   */
  deploy = async (
    uniqueBackendIdentifier: UniqueBackendIdentifier,
    typeCheckingEnabled: boolean
  ): Promise<void> => {
    console.debug('[Sandbox] Executing command `deploy`');
    const secretLastUpdated = await this.getSecretLastUpdated(
      uniqueBackendIdentifier
    );
    try {
      await this.invoke(
        async () =>
          await this.backendDeployer.deploy(uniqueBackendIdentifier, {
            deploymentType: BackendDeploymentType.SANDBOX,
            secretLastUpdated,
            typeCheckingEnabled,
          })
      );
    } catch (error) {
      console.log(this.getErrorMessage(error));
      // do not propagate and let the sandbox continue to run
    }
  };

  /**
   * Destroy sandbox. Do not swallow errors
   */
  destroy = (
    uniqueBackendIdentifier?: UniqueBackendIdentifier
  ): Promise<void> => {
    console.debug('[Sandbox] Executing command `destroy`');
    return this.invoke(
      async () =>
        await this.backendDeployer.destroy(uniqueBackendIdentifier, {
          deploymentType: BackendDeploymentType.SANDBOX,
        })
    );
  };

  /**
   * Function that invokes the callback with debounce.
   * Debounce is needed in case multiple duplicate events are received.
   */
  private invoke = debounce(
    async (callback: () => Promise<void>): Promise<void> => await callback(),
    100
  );

  /**
   * Generates a printable error message from the thrown error
   */
  private getErrorMessage(error: unknown) {
    let message;
    if (error instanceof Error) {
      message = error.message;

      // Add the downstream exception
      if (error.cause && error.cause instanceof Error) {
        message = `${message}\nCaused By: ${
          error.cause instanceof Error
            ? error.cause.message
            : String(error.cause)
        }`;
      }
    } else message = String(error);
    return message;
  }
}
