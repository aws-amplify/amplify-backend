import debounce from 'debounce-promise';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  BackendDeployer,
  DeployResult,
  DestroyResult,
} from '@aws-amplify/backend-deployer';
import { SecretClient } from '@aws-amplify/backend-secret';
import { LogLevel, Printer } from '@aws-amplify/cli-core';

/**
 * Execute CDK commands.
 */
export class AmplifySandboxExecutor {
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

  /**
   * Creates an AmplifySandboxExecutor instance
   */
  constructor(
    private readonly backendDeployer: BackendDeployer,
    private readonly secretClient: SecretClient,
    private readonly printer: Printer
  ) {}

  /**
   * Deploys sandbox
   */
  deploy = async (
    backendId: BackendIdentifier,
    validateAppSourcesProvider: () => boolean
  ): Promise<DeployResult> => {
    this.printer.log('[Sandbox] Executing command `deploy`', LogLevel.DEBUG);
    const secretLastUpdated = await this.getSecretLastUpdated(backendId);

    return this.invoke(() => {
      // it's important to get information here so that information
      // doesn't get lost while debouncing
      const validateAppSources = validateAppSourcesProvider();
      return this.backendDeployer.deploy(backendId, {
        secretLastUpdated,
        validateAppSources,
      });
    });
  };

  /**
   * Destroy sandbox. Do not swallow errors
   */
  destroy = (backendId: BackendIdentifier): Promise<DestroyResult> => {
    this.printer.log('[Sandbox] Executing command `destroy`', LogLevel.DEBUG);
    return this.invoke(() => this.backendDeployer.destroy(backendId));
  };

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
}
