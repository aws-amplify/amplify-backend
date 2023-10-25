import debounce from 'debounce-promise';
import { BackendDeployer } from '@aws-amplify/backend-deployer';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { BackendDeploymentType } from '@aws-amplify/platform-core';
import { SecretClient } from '@aws-amplify/backend-secret';

export const CDK_OUTPUT_PATH = '.amplify/artifacts/cdk.out';

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
  ): Promise<void> => {
    console.debug('[Sandbox] Executing command `deploy`');
    const secretLastUpdated = await this.getSecretLastUpdated(
      uniqueBackendIdentifier
    );

    await this.invoke(async () => {
      // it's important to get information here so that information
      // doesn't get lost while debouncing
      const validateAppSources = validateAppSourcesProvider();
      await this.backendDeployer.deploy(uniqueBackendIdentifier, {
        deploymentType: BackendDeploymentType.SANDBOX,
        secretLastUpdated,
        validateAppSources,
        cdkOutputPath: CDK_OUTPUT_PATH,
      });
    });
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
          cdkOutputPath: CDK_OUTPUT_PATH,
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
}
