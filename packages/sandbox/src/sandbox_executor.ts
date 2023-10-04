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
    uniqueBackendIdentifier: UniqueBackendIdentifier
  ): Promise<void> => {
    console.debug('[Sandbox] Executing command `deploy`');
    const secretLastUpdated = await this.getSecretLastUpdated(
      uniqueBackendIdentifier
    );
    return this.invoke(() =>
      this.backendDeployer.deploy(uniqueBackendIdentifier, {
        deploymentType: BackendDeploymentType.SANDBOX,
        secretLastUpdated,
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
