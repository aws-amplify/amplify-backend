import { CfnElement, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ProjectEnvironmentIdentifier } from './project_environment_identifier.js';

/**
 * Properties to initialize an AmplifyStack
 */
export type AmplifyStackProps = {
  readonly projectEnvironmentIdentifier: ProjectEnvironmentIdentifier;
};

/**
 * Amplify-specific Stack implementation to handle cross-cutting concerns for all Amplify stacks
 */
export class AmplifyStack extends Stack {
  /**
   * Identifier for the project environment this stack exists in
   */
  readonly projectEnvironmentIdentifier: ProjectEnvironmentIdentifier;

  /**
   * Initializes the stack with a name that is unique to the provided Amplify environment
   */
  constructor(scope: Construct, id: string, props: AmplifyStackProps) {
    super(scope, id, {
      stackName: props.projectEnvironmentIdentifier.toStackName(),
    });
    this.projectEnvironmentIdentifier = props.projectEnvironmentIdentifier;
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
