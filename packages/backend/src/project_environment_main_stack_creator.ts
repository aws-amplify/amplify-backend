import {
  MainStackCreator,
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
export class ProjectEnvironmentMainStackCreator implements MainStackCreator {
  private mainStack: Stack | undefined = undefined;
  /**
   * Initialize with a project environment
   */
  constructor(
    private readonly scope: Construct,
    private readonly projectEnvironmentIdentifier: ProjectEnvironmentIdentifier
  ) {}

  /**
   * Get a stack for this environment in the provided CDK scope
   */
  getOrCreateMainStack(): Stack {
    if (this.mainStack === undefined) {
      this.mainStack = new AmplifyStack(this.scope, this.toStackName());
      new aws_ssm.StringParameter(this.mainStack, 'amplifyStackIdentifier', {
        parameterName: getProjectEnvironmentMainStackSSMParameterKey(
          this.projectEnvironmentIdentifier
        ),
        stringValue: this.mainStack.stackName,
      });
    }
    return this.mainStack;
  }

  /**
   * Create a stack name for this environment
   */
  private toStackName(): string {
    return `${this.projectEnvironmentIdentifier.projectName}-${this.projectEnvironmentIdentifier.environmentName}`;
  }
}
