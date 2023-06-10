import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { ProjectEnvironmentIdentifier } from '@aws-amplify/primitives';

export type StackNameResolver = {
  fetchStackName(): Promise<string>;
};

/**
 * Resolves a stack name based on an SSM parameter corresponding to a project environment
 */
export class ProjectEnvironmentStackNameResolver implements StackNameResolver {
  /**
   * Provide the ProjectEnvironmentIdentifier and an SSMClient to resolve the SSM ParameterStore parameter
   */
  constructor(
    private readonly ssmClient: SSMClient,
    private readonly projectEnvironmentIdentifier: ProjectEnvironmentIdentifier
  ) {}

  /**
   * Fetches the value of the ParameterStore key for this project environment
   */
  async fetchStackName(): Promise<string> {
    const result = await this.ssmClient.send(
      new GetParameterCommand({
        Name: this.projectEnvironmentIdentifier.toOutputStackSSMParameterName(),
      })
    );

    if (typeof result?.Parameter?.Value !== 'string') {
      throw new Error(
        `Could not resolve string parameter value from ${this.projectEnvironmentIdentifier.toOutputStackSSMParameterName()}`
      );
    }
    return result.Parameter.Value;
  }
}

/**
 * Implementation of StackNameResolver when a stack name is already known
 */
export class PassThroughStackNameResolver implements StackNameResolver {
  /**
   * Pass in the known stack name
   */
  constructor(private readonly stackName: string) {}

  /**
   * Returns the known stack name
   */
  async fetchStackName(): Promise<string> {
    return this.stackName;
  }
}
