import { CommandModule } from 'yargs';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import {
  PackageManagerControllerFactory,
  printer,
} from '@aws-amplify/cli-core';

import {
  PipelineDeployCommand,
  PipelineDeployCommandOptions,
} from './pipeline_deploy_command.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

/**
 * Creates pipeline deploy command
 */
export const createPipelineDeployCommand = (): CommandModule<
  object,
  PipelineDeployCommandOptions
> => {
  const clientConfigGenerator = new ClientConfigGeneratorAdapter({
    getS3Client: () => new S3Client(),
    getAmplifyClient: () => new AmplifyClient(),
    getCloudFormationClient: () => new CloudFormationClient(),
  });
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
