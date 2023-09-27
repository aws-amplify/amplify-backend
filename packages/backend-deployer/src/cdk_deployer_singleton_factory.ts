import { UniqueBackendIdentifier } from '@aws-amplify/platform-core';
import { CDKDeployer } from './cdk_deployer.js';
import { CdkErrorMapper } from './cdk_error_mapper.js';

export type DeployProps = {
  hotswapFallback?: boolean;
  method?: 'direct';
};

/**
 * Invokes an invokable command
 */
export type BackendDeployer = {
  deploy: (
    uniqueBackendIdentifier?: UniqueBackendIdentifier,
    deployProps?: DeployProps
  ) => Promise<void>;
  destroy: (uniqueBackendIdentifier?: UniqueBackendIdentifier) => Promise<void>;
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
      BackendDeployerFactory.instance = new CDKDeployer(new CdkErrorMapper());
    }
    return BackendDeployerFactory.instance;
  };
}
