import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import { PackageManagerControllerFactory, format } from '@aws-amplify/cli-core';
import { CheckCommand } from './check_command.js';

/**
 * Creates Check command.
 */
export const createCheckCommand = (): CheckCommand => {
  const packageManagerControllerFactory = new PackageManagerControllerFactory();
  const backendDeployerFactory = new BackendDeployerFactory(
    packageManagerControllerFactory.getPackageManagerController(),
    format
  );
  const backendDeployer = backendDeployerFactory.getInstance();
  return new CheckCommand(backendDeployer);
};
