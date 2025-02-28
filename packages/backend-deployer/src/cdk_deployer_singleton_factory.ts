import {
  AmplifyIOHost,
  BackendIdentifier,
  type PackageManagerController,
} from '@aws-amplify/plugin-types';
import { CDKDeployer } from './cdk_deployer.js';
import { CdkErrorMapper } from './cdk_error_mapper.js';
import { BackendLocator } from '@aws-amplify/platform-core';
import { BackendDeployerOutputFormatter } from './types.js';
import { Toolkit } from '@aws-cdk/toolkit-lib';

export type DeployProps = {
  secretLastUpdated?: Date;
  validateAppSources?: boolean;
  profile?: string;
};

export type DestroyProps = {
  profile?: string;
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
  destroy: (
    backendId: BackendIdentifier,
    destroyProps?: DestroyProps
  ) => Promise<DestroyResult>;
};

/**
 * Factory to create a backend deployer
 */
export class BackendDeployerFactory {
  private static instance: BackendDeployer | undefined;

  /**
   * constructor - sets the packageManagerController
   */
  constructor(
    private readonly packageManagerController: PackageManagerController,
    private readonly formatter: BackendDeployerOutputFormatter,
    private readonly backendDeployerIOHost: AmplifyIOHost
  ) {}

  /**
   * Returns a single instance of BackendDeployer
   */
  getInstance(): BackendDeployer {
    if (!BackendDeployerFactory.instance) {
      let profile = undefined;
      if (process && process.argv) {
        for (let i = 2; i < process.argv.length; i++) {
          if (process.argv[i] == '--profile') {
            profile = process.argv[i + 1];
          }
        }
      }

      BackendDeployerFactory.instance = new CDKDeployer(
        new CdkErrorMapper(this.formatter),
        new BackendLocator(),
        this.packageManagerController,
        new Toolkit({
          ioHost: this.backendDeployerIOHost,
          emojis: false,
          color: false,
          sdkConfig: {
            profile,
          },
        }),
        this.backendDeployerIOHost
      );
    }
    return BackendDeployerFactory.instance;
  }
}
