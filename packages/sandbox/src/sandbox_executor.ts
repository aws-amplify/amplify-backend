import debounce from 'debounce-promise';
import { BackendDeployer } from '@aws-amplify/backend-deployer';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
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
    backendId: BackendIdentifier
  ): Promise<Date | undefined> => {
    const secrets = await this.secretClient.listSecrets(backendId);
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
    backendId: BackendIdentifier,
    validateAppSourcesProvider: () => boolean
  ): Promise<void> => {
    console.debug('[Sandbox] Executing command `deploy`');
    const secretLastUpdated = await this.getSecretLastUpdated(backendId);

    await this.invoke(async () => {
      // it's important to get information here so that information
      // doesn't get lost while debouncing
      const validateAppSources = validateAppSourcesProvider();
      await this.backendDeployer.deploy(backendId, {
        deploymentType: 'sandbox',
        secretLastUpdated,
        validateAppSources,
      });
    });
  };

  /**
   * Destroy sandbox. Do not swallow errors
   */
  destroy = (backendId?: BackendIdentifier): Promise<void> => {
    console.debug('[Sandbox] Executing command `destroy`');
    return this.invoke(
      async () =>
        await this.backendDeployer.destroy(backendId, {
          deploymentType: 'sandbox',
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
