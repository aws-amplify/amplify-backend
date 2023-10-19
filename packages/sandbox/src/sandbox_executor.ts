import debounce from 'debounce-promise';
import { BackendDeployer } from '@aws-amplify/backend-deployer';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { BackendDeploymentType } from '@aws-amplify/platform-core';
import { SecretClient } from '@aws-amplify/backend-secret';
import { FileChangesTracker } from './file_changes_tracker.js';

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
    fileChangesTracker: FileChangesTracker
  ): Promise<void> => {
    console.debug('[Sandbox] Executing command `deploy`');
    const secretLastUpdated = await this.getSecretLastUpdated(
      uniqueBackendIdentifier
    );
    await this.invoke(async () => {
      // it's important to get information about file changes and reset tracker here
      // so that it doesn't get lost in debounced calls.
      const fileChangesSummary = fileChangesTracker.getSummaryAndReset();
      const typeCheckingEnabled =
        // zero files changed indicate that deployment was kicked off due to different
        // reason than file change, e.g. at initial start
        fileChangesSummary.filesChanged === 0 ||
        fileChangesSummary.typeScriptFilesChanged > 0;
      await this.backendDeployer.deploy(uniqueBackendIdentifier, {
        deploymentType: BackendDeploymentType.SANDBOX,
        secretLastUpdated,
        typeCheckingEnabled,
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
