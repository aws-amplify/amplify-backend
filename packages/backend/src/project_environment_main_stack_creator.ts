import { BackendIdentifier, MainStackCreator } from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { Stack, Tags } from 'aws-cdk-lib';
import { AmplifyStack } from './engine/amplify_stack.js';

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
    private readonly backendId: BackendIdentifier
  ) {}

  /**
   * Get a stack for this environment in the provided CDK scope
   */
  getOrCreateMainStack = (): Stack => {
    if (this.mainStack === undefined) {
      this.mainStack = new AmplifyStack(this.scope, this.backendId);
    }

    const deploymentType = this.backendId.type;
    Tags.of(this.mainStack).add('created-by', 'amplify');
    if (deploymentType === 'branch') {
      Tags.of(this.mainStack).add('amplify:app-id', this.backendId.namespace);
      Tags.of(this.mainStack).add('amplify:branch-name', this.backendId.name);
      Tags.of(this.mainStack).add('amplify:deployment-type', 'branch');
    } else if (deploymentType === 'sandbox') {
      Tags.of(this.mainStack).add('amplify:deployment-type', 'sandbox');
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.mainStack!;
  };
}
