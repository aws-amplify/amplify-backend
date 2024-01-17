import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { CDKDeployer } from './cdk_deployer.js';
import { CdkErrorMapper } from './cdk_error_mapper.js';
import { BackendLocator } from '@aws-amplify/platform-core';

export type DeployProps = {
  secretLastUpdated?: Date;
  validateAppSources?: boolean;
};

export type DeployResult = {
  deploymentTimes: DeploymentTimes;
};

export type DestroyResult = {
  deploymentTimes: DeploymentTimes;
};

export type DeploymentTimes = {
  synthesisTime?: number;
  totalTime?: number;
};

/**
 * Invokes an invokable command
 */
export type BackendDeployer = {
  deploy: (
    backendId: BackendIdentifier,
    deployProps?: DeployProps
  ) => Promise<DeployResult>;
  destroy: (backendId: BackendIdentifier) => Promise<DestroyResult>;
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
      const { PACKAGE_MANAGER = 'npm' } = process.env;
      const packageManager = PACKAGE_MANAGER.startsWith('yarn')
        ? 'yarn'
        : PACKAGE_MANAGER;
      BackendDeployerFactory.instance = new CDKDeployer(
        new CdkErrorMapper(),
        new BackendLocator(),
        packageManager
      );
    }
    return BackendDeployerFactory.instance;
  };
}
