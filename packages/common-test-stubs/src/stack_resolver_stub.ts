import { NestedStack, Stack } from 'aws-cdk-lib';

/**
 * Vends stacks for a resource grouping
 */
export type StackResolver = {
  getStackFor: (resourceGroupName: string) => Stack;
};

/**
 * Vends and caches nested stacks under a provided root stack
 */
export class StackResolverStub implements StackResolver {
  private readonly stacks: Record<string, Stack> = {};

  /**
   * Initialize with a root stack
   */
  constructor(private readonly rootStack: Stack) {}

  /**
   * Returns a cached NestedStack if resourceGroupName has been seen before
   * Otherwise, creates a new NestedStack, caches it and returns it
   */
  getStackFor = (resourceGroupName: string): Stack => {
    if (!this.stacks[resourceGroupName]) {
      this.stacks[resourceGroupName] = new NestedStack(
        this.rootStack,
        resourceGroupName
      );
    }
    return this.stacks[resourceGroupName];
  };
}
