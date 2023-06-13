import {
  BackendStackResolver,
  ProjectEnvironmentIdentifier,
} from '@aws-amplify/backend-types';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { getProjectEnvironmentMainStackSSMParameterKey } from '../backend-output/get_project_environment_main_stack_ssm_parameter_key.js';

/**
 * Can create stacks and resolve stack names for a given project environment
 */
export class ProjectEnvironmentBackendStackResolver
  implements BackendStackResolver
{
  /**
   * Initialize with the project environment identifier
   */
  constructor(
    private readonly ssmClient: SSMClient,
    private readonly projectEnvironmentIdentifier: ProjectEnvironmentIdentifier
  ) {}

  /**
   * Resolve the stack name for this project environment
   */
  async resolveStackName(): Promise<string> {
    const paramName = getProjectEnvironmentMainStackSSMParameterKey(
      this.projectEnvironmentIdentifier
    );
    const result = await this.ssmClient.send(
      new GetParameterCommand({
        Name: paramName,
      })
    );

    if (typeof result?.Parameter?.Value !== 'string') {
      throw new Error(
        `Could not resolve string parameter value from ${paramName}`
      );
    }
    return result.Parameter.Value;
  }
}
