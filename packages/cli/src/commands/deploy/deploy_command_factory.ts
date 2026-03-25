import { CommandModule } from 'yargs';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import {
  AmplifyIOEventsBridgeSingletonFactory,
  PackageManagerControllerFactory,
  format,
  printer,
} from '@aws-amplify/cli-core';

import { DeployCommand, DeployCommandOptions } from './deploy_command.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { SDKProfileResolverProvider } from '../../sdk_profile_resolver_provider.js';
import { CommandMiddleware } from '../../command_middleware.js';
import { SSMClient } from '@aws-sdk/client-ssm';

/**
 * Creates the deploy command.
 */
export const createDeployCommand = (): CommandModule<
  object,
  DeployCommandOptions
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
    awsClientProvider,
  );
  const packageManagerControllerFactory = new PackageManagerControllerFactory();
  const cdkEventsBridgeIoHost =
    new AmplifyIOEventsBridgeSingletonFactory().getInstance();

  const backendDeployerFactory = new BackendDeployerFactory(
    packageManagerControllerFactory.getPackageManagerController(),
    format,
    cdkEventsBridgeIoHost,
    new SDKProfileResolverProvider().resolve,
  );
  const backendDeployer = backendDeployerFactory.getInstance();
  const commandMiddleware = new CommandMiddleware(printer);
  const ssmClient = new SSMClient();
  return new DeployCommand(
    clientConfigGenerator,
    backendDeployer,
    commandMiddleware,
    ssmClient,
  );
};
