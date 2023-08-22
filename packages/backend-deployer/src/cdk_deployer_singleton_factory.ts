import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { CDKDeployer } from './cdk_deployer.js';

export * from './cdk_deployer.js';

/**
 * Commands that can be invoked
 */
export enum InvokableCommand {
  DEPLOY = 'deploy',
  DESTROY = 'destroy',
}

export type DeployCommandProps = {
  hotswapFallback?: boolean;
  method?: 'direct';
};

export type DestroyCommandProps = {
  force?: boolean;
};

/**
 * Invokes an invokable command
 */
export interface BackendDeployer {
  deploy: (
    uniqueBackendIdentifier?: UniqueBackendIdentifier,
    deployCommandProps?: DeployCommandProps
  ) => Promise<void>;
  destroy: (
    uniqueBackendIdentifier?: UniqueBackendIdentifier,
    destroyCommandProps?: DestroyCommandProps
  ) => Promise<void>;
}

/**
 * Factory to create a backend deployer
 */
export class BackendDeployerSingletonFactory {
  private static instance: BackendDeployer | undefined;

  /**
   * Returns a single instance of BackendDeployer
   */
  static getInstance(): BackendDeployer {
    if (!BackendDeployerSingletonFactory.instance) {
      BackendDeployerSingletonFactory.instance = new CDKDeployer();
    }
    return BackendDeployerSingletonFactory.instance;
  }
}
