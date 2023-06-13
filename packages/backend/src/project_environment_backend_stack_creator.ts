import {
  BackendStackCreator,
  ProjectEnvironmentIdentifier,
} from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { aws_ssm, Stack } from 'aws-cdk-lib';
import {
  AmplifyStack,
  getProjectEnvironmentMainStackSSMParameterKey,
} from '@aws-amplify/backend-engine';

/**
 * Creates stacks that are tied to a given project environment via an SSM parameter
 */
export class ProjectEnvironmentBackendStackCreator
  implements BackendStackCreator
{
  /**
   * Initialize with a project environment
   */
  constructor(
    private readonly projectEnvironmentIdentifier: ProjectEnvironmentIdentifier
  ) {}

  /**
   * Get a stack for this environment in the provided CDK scope
   */
  createStack(scope: Construct): Stack {
    const stack = new AmplifyStack(scope, this.toStackName());
    new aws_ssm.StringParameter(stack, 'amplifyStackIdentifier', {
      parameterName: getProjectEnvironmentMainStackSSMParameterKey(
        this.projectEnvironmentIdentifier
      ),
      stringValue: stack.stackName,
    });
    return stack;
  }

  /**
   * Create a stack name for this environment
   */
  private toStackName(): string {
    return `${this.projectEnvironmentIdentifier.projectName}-${this.projectEnvironmentIdentifier.environmentName}`;
  }
}
