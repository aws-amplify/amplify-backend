import { type CfnElement, Stack } from 'aws-cdk-lib';

/**
 * Test implementation of AmplifyStack. Currently copied from the real implementation of AmplifyStack but the implementations do not need to match going forward
 */
export class AmplifyStackStub extends Stack {
  /**
   * Overrides Stack.allocateLogicalId to prevent redundant nested stack logical IDs
   */
  allocateLogicalId = (element: CfnElement): string => {
    // Nested stack logical IDs have a redundant structure of <name>NestedStack<name>NestedStackResource<hash>
    // This rewrites the nested stack logical ID to <name><hash>
    const defaultId = super.allocateLogicalId(element);
    const match = /(?<name>.*)NestedStack.+NestedStackResource(?<hash>.*)/.exec(
      defaultId
    );
    if (match && match.groups && Object.keys(match.groups || {}).length === 2) {
      return `${match.groups.name}${match.groups.hash}`;
    }
    return defaultId;
  };
}
