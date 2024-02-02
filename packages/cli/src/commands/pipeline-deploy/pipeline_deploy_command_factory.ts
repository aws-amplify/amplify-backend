import { CommandModule } from 'yargs';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import { PackageManagerControllerFactory } from '@aws-amplify/cli-core';

import {
  PipelineDeployCommand,
  PipelineDeployCommandOptions,
} from './pipeline_deploy_command.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { printer } from '../../printer.js';

/**
 * Creates pipeline deploy command
 */
export const createPipelineDeployCommand = (): CommandModule<
  object,
  PipelineDeployCommandOptions
> => {
  const credentialProvider = fromNodeProviderChain();
  const clientConfigGenerator = new ClientConfigGeneratorAdapter(
    credentialProvider
  );
  const packageManagerControllerFactory = new PackageManagerControllerFactory(
    process.cwd(),
    printer
  );
  const backendDeployerFactory = new BackendDeployerFactory(
    packageManagerControllerFactory.getPackageManagerController()
  );
  const backendDeployer = backendDeployerFactory.getInstance();
  return new PipelineDeployCommand(clientConfigGenerator, backendDeployer);
};
