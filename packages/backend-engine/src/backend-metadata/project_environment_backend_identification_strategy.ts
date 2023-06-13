import {
  BackendStackCreator,
  BackendStackResolver,
  ProjectEnvironmentIdentifier,
} from '@aws-amplify/backend-types';
import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { AmplifyStack } from '../amplify_stack.js';

/**
 * Can create stacks and resolve stack names for a given project environment
 */
export class ProjectEnvironmentBackendIdentificationStrategy
  implements BackendStackCreator, BackendStackResolver
{
  /**
   * Initialize with the project environment identifier
   */
  constructor(
    private readonly projectEnvironmentIdentifier: ProjectEnvironmentIdentifier
  ) {}

  /**
   * Get a stack for this environment in the provided CDK scope
   */
  createStack(scope: Construct): Stack {
    return new AmplifyStack(scope, this.toStackName());
  }

  /**
   * Resolve the stack name for this project environment
   */
  async resolveStackName(ssmClient: SSMClient): Promise<string> {
    const result = await ssmClient.send(
      new GetParameterCommand({
        Name: this.toSSMParamName(),
      })
    );

    if (typeof result?.Parameter?.Value !== 'string') {
      throw new Error(
        `Could not resolve string parameter value from ${this.toStackName()}`
      );
    }
    return result.Parameter.Value;
  }

  /**
   * Create a unique name for a stack in this environment
   */
  private toStackName(): string {
    return `${this.projectEnvironmentIdentifier.projectName}-${this.projectEnvironmentIdentifier.environmentName}`;
  }

  /**
   * Create a unique SSM parameter key for this environment
   */
  private toSSMParamName(): string {
    return `/amplify/${this.projectEnvironmentIdentifier.projectName}/${this.projectEnvironmentIdentifier.environmentName}/mainStackName`;
  }
}
