import debounce from 'debounce-promise';
import {
  BackendDeployer,
  DeployResult,
  DestroyResult,
} from '@aws-amplify/backend-deployer';
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
    validateAppSourcesProvider: () => boolean
  ): Promise<DeployResult> => {
    console.debug('[Sandbox] Executing command `deploy`');
    const secretLastUpdated = await this.getSecretLastUpdated(
      uniqueBackendIdentifier
    );

    return this.invoke(() => {
      // it's important to get information here so that information
      // doesn't get lost while debouncing
      const validateAppSources = validateAppSourcesProvider();
      return this.backendDeployer.deploy(uniqueBackendIdentifier, {
        deploymentType: BackendDeploymentType.SANDBOX,
        secretLastUpdated,
        validateAppSources,
      });
    });
  };

  /**
   * Destroy sandbox. Do not swallow errors
   */
  destroy = (
    uniqueBackendIdentifier?: UniqueBackendIdentifier
  ): Promise<DestroyResult> => {
    console.debug('[Sandbox] Executing command `destroy`');
    return this.invoke(() =>
      this.backendDeployer.destroy(uniqueBackendIdentifier, {
        deploymentType: BackendDeploymentType.SANDBOX,
      })
    );
  };

  /**
   * Function that invokes the callback with debounce.
   * Debounce is needed in case multiple duplicate events are received.
   */
  private invoke = debounce(
    async (
      callback: () => Promise<DeployResult | DestroyResult>
    ): Promise<DeployResult | DestroyResult> => await callback(),
    100
  );
}
