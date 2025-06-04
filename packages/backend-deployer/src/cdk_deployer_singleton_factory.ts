import {
  AmplifyIOHost,
  BackendIdentifier,
  PackageManagerController,
  SDKProfileResolver,
} from '@aws-amplify/plugin-types';
import { CDKDeployer } from './cdk_deployer.js';
import { CdkErrorMapper } from './cdk_error_mapper.js';
import { BackendLocator } from '@aws-amplify/platform-core';
import { BackendDeployerOutputFormatter } from './types.js';
import { BaseCredentials, Toolkit } from '@aws-cdk/toolkit-lib';

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
    deployProps?: DeployProps,
  ) => Promise<DeployResult>;
  destroy: (backendId: BackendIdentifier) => Promise<DestroyResult>;
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
    private readonly backendDeployerIOHost: AmplifyIOHost,
    private readonly sdkProfileResolver: SDKProfileResolver,
  ) {}

  /**
   * Returns a single instance of BackendDeployer
   */
  getInstance(): BackendDeployer {
    if (!BackendDeployerFactory.instance) {
      BackendDeployerFactory.instance = new CDKDeployer(
        new CdkErrorMapper(this.formatter),
        new BackendLocator(),
        this.packageManagerController,
        new Toolkit({
          ioHost: this.backendDeployerIOHost,
          emojis: false,
          color: false,
          sdkConfig: {
            baseCredentials: BaseCredentials.awsCliCompatible({
              profile: this.sdkProfileResolver(),
            }),
          },
        }),
        this.backendDeployerIOHost,
      );
    }
    return BackendDeployerFactory.instance;
  }
}
