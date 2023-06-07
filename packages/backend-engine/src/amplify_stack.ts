import { CfnElement, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ProjectEnvironmentTuple } from './project_environment_tuple.js';

type AmplifyStackProps = {
  projectEnvironmentTuple: ProjectEnvironmentTuple;
};

/**
 * Amplify-specific Stack implementation to handle cross-cutting concerns for all Amplify stacks
 */
export class AmplifyStack extends Stack {
  projectEnvironmentTuple: ProjectEnvironmentTuple;

  /**
   * Initializes the stack with a name that is unique to the provided Amplify environment
   */
  constructor(scope: Construct, id: string, props: AmplifyStackProps) {
    super(scope, id, {
      stackName: `${props.projectEnvironmentTuple.projectName}-${props.projectEnvironmentTuple.environmentName}`,
    });
    this.projectEnvironmentTuple = props.projectEnvironmentTuple;
  }
  /**
   * Overrides Stack.allocateLogicalId to prevent redundant nested stack logical IDs
   */
  allocateLogicalId(element: CfnElement): string {
    // Nested stack logical IDs have a redundant structure of <name>NestedStack<name>NestedStackResource<hash>
    // This rewrites the nested stack logical ID to <name><hash>
    const defaultId = super.allocateLogicalId(element);
    const match = /(?<name>.*)NestedStack.+NestedStackResource(?<hash>.*)/.exec(
      defaultId
    );
    if (Object.keys(match?.groups || {}).length === 2) {
      return `${match?.groups?.name}${match?.groups?.hash}`;
    }
    return defaultId;
  }
}
