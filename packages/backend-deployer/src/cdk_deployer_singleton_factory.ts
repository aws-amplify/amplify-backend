import { BackendIdentifier, DeploymentType } from '@aws-amplify/plugin-types';
import { CDKDeployer } from './cdk_deployer.js';
import { CdkErrorMapper } from './cdk_error_mapper.js';
import { BackendLocator } from '@aws-amplify/platform-core';

export type DeployProps = {
  deploymentType?: DeploymentType;
  secretLastUpdated?: Date;
  validateAppSources?: boolean;
};

export type DestroyProps = {
  deploymentType?: DeploymentType;
};

/**
 * Invokes an invokable command
 */
export type BackendDeployer = {
  deploy: (
    backendId?: BackendIdentifier,
    deployProps?: DeployProps
  ) => Promise<void>;
  destroy: (
    backendId?: BackendIdentifier,
    destroyProps?: DestroyProps
  ) => Promise<void>;
};

/**
 * Factory to create a backend deployer
 */
export class BackendDeployerFactory {
  private static instance: BackendDeployer | undefined;

  /**
   * Returns a single instance of BackendDeployer
   */
  static getInstance = (): BackendDeployer => {
    if (!BackendDeployerFactory.instance) {
      BackendDeployerFactory.instance = new CDKDeployer(
        new CdkErrorMapper(),
        new BackendLocator()
      );
    }
    return BackendDeployerFactory.instance;
  };
}
