import { CommandModule } from 'yargs';
import { BackendDeployerSingletonFactory } from '@aws-amplify/backend-deployer';

import {
  PipelineDeployCommand,
  PipelineDeployCommandOptions,
} from './pipeline_deploy_command.js';

/**
 * Creates pipeline deploy command
 */
export const createPipelineDeployCommand = (): CommandModule<
  object,
  PipelineDeployCommandOptions
> => {
  const backendDeployer = BackendDeployerSingletonFactory.getInstance();
  return new PipelineDeployCommand(backendDeployer);
};
