import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { CDKDeployer } from './cdk_deployer.js';
import { CdkErrorMapper } from './cdk_error_mapper.js';
import {
  BackendDeploymentType,
  BackendLocator,
} from '@aws-amplify/platform-core';

export type DeployProps = {
  deploymentType?: BackendDeploymentType;
  secretLastUpdated?: Date;
  validateAppSources?: boolean;
};

export type DestroyProps = {
  deploymentType?: BackendDeploymentType;
};

/**
 * Invokes an invokable command
 */
export type BackendDeployer = {
  deploy: (
    uniqueBackendIdentifier?: UniqueBackendIdentifier,
    deployProps?: DeployProps
  ) => Promise<void>;
  destroy: (
    uniqueBackendIdentifier?: UniqueBackendIdentifier,
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
