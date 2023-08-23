import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { CDKDeployer } from './cdk_deployer.js';

export type DeployProps = {
  hotswapFallback?: boolean;
  method?: 'direct';
};

export type DestroyProps = {
  force?: boolean;
};

/**
 * Invokes an invokable command
 */
export interface BackendDeployer {
  deploy: (
    uniqueBackendIdentifier?: UniqueBackendIdentifier,
    deployProps?: DeployProps
  ) => Promise<void>;
  destroy: (
    uniqueBackendIdentifier?: UniqueBackendIdentifier,
    destroyProps?: DestroyProps
  ) => Promise<void>;
}

/**
 * Factory to create a backend deployer
 */
export class BackendDeployerFactory {
  private static instance: BackendDeployer | undefined;

  /**
   * Returns a single instance of BackendDeployer
   */
  static getInstance(): BackendDeployer {
    if (!BackendDeployerFactory.instance) {
      BackendDeployerFactory.instance = new CDKDeployer();
    }
    return BackendDeployerFactory.instance;
  }
}
