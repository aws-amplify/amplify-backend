import {
  MainStackCreator,
  ProjectEnvironmentIdentifier,
} from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { aws_ssm, Stack } from 'aws-cdk-lib';
import { AmplifyStack } from './engine/amplify_stack.js';
import { getProjectEnvironmentMainStackSSMParameterKey } from './get_project_environment_main_stack_ssm_parameter_key.js';

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
      const stack = new AmplifyStack(this.scope, this.toStackName());
      new aws_ssm.StringParameter(stack, 'amplifyStackIdentifier', {
        parameterName: getProjectEnvironmentMainStackSSMParameterKey(
          this.projectEnvironmentIdentifier
        ),
        stringValue: stack.stackName,
      });
      this.mainStack = stack;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.mainStack!;
  }

  /**
   * Create a stack name for this environment
   */
  private toStackName(): string {
    return `${this.projectEnvironmentIdentifier.projectName}-${this.projectEnvironmentIdentifier.environmentName}`;
  }
}
