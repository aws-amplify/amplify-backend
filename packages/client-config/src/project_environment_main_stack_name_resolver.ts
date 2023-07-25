import {
  MainStackNameResolver,
  ProjectEnvironmentIdentifier,
} from '@aws-amplify/plugin-types';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { getProjectEnvironmentMainStackSSMParameterKey } from './get_project_environment_main_stack_ssm_parameter_key.js';

/**
 * Resolves the main stack name for a given project environment
 */
export class ProjectEnvironmentMainStackNameResolver
  implements MainStackNameResolver
{
  /**
   * Initialize with the project environment identifier and an SSMClient
   */
  constructor(
    private readonly ssmClient: SSMClient,
    private readonly projectEnvironmentIdentifier: ProjectEnvironmentIdentifier
  ) {}

  /**
   * Resolve the stack name for this project environment
   */
  async resolveMainStackName(): Promise<string> {
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
