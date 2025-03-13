import { CommandModule } from 'yargs';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import {
  AmplifyIOEventsBridgeSingletonFactory,
  PackageManagerControllerFactory,
  format,
} from '@aws-amplify/cli-core';

import {
  PipelineDeployCommand,
  PipelineDeployCommandOptions,
} from './pipeline_deploy_command.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { SDKProfileResolverProvider } from '../../sdk_profile_resolver_provider.js';

/**
 * Creates pipeline deploy command
 */
export const createPipelineDeployCommand = (): CommandModule<
  object,
  PipelineDeployCommandOptions
> => {
  const s3Client = new S3Client();
  const amplifyClient = new AmplifyClient();
  const cloudFormationClient = new CloudFormationClient();

  const awsClientProvider = {
    getS3Client: () => s3Client,
    getAmplifyClient: () => amplifyClient,
    getCloudFormationClient: () => cloudFormationClient,
  };
  const clientConfigGenerator = new ClientConfigGeneratorAdapter(
    awsClientProvider
  );
  const packageManagerControllerFactory = new PackageManagerControllerFactory();
  const cdkEventsBridgeIoHost =
    new AmplifyIOEventsBridgeSingletonFactory().getInstance();

  const backendDeployerFactory = new BackendDeployerFactory(
    packageManagerControllerFactory.getPackageManagerController(),
    format,
    cdkEventsBridgeIoHost,
    new SDKProfileResolverProvider().resolve
  );
  const backendDeployer = backendDeployerFactory.getInstance();
  return new PipelineDeployCommand(clientConfigGenerator, backendDeployer);
};
