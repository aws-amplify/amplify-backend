import { CfnElement, Stack } from 'aws-cdk-lib';

/**
 * Amplify-specific Stack implementation to handle cross-cutting concerns for all Amplify stacks
 */
export class AmplifyStack extends Stack {
  /**
   * Override of logical ID resolution that removes redundant naming from nested stacks
   */
  getLogicalId(element: CfnElement): string {
    // Nested stack logical IDs have a redundant structure of <name>NestedStack<name>NestedStackResource<hash>
    // This rewrites the nested stack logical ID to <name><hash>
    if (element.node.id.includes('NestedStackResource')) {
      const defaultId = super.getLogicalId(element);
      const match =
        /(?<name>.*)NestedStack.+NestedStackResource(?<hash>.*)/.exec(
          defaultId
        );
      if (Object.keys(match?.groups || {}).length !== 2) {
        // if something goes wrong with this regex, bail out and return the original logical id
        return defaultId;
      }
      return `${match?.groups?.name}${match?.groups?.hash}`;
    }
    return super.getLogicalId(element);
  }
}
