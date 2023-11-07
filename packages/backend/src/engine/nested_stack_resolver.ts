import { NestedStack, Stack } from 'aws-cdk-lib';
import { AttributionMetadataStorage } from '@aws-amplify/backend-output-storage';
import { fileURLToPath } from 'url';

/**
 * Vends stacks for a resource grouping
 */
export type StackResolver = {
  getStackFor: (resourceGroupName: string) => Stack;
  getCustomStack: (name: string) => Stack;
};

/**
 * Vends and caches nested stacks under a provided root stack
 */
export class NestedStackResolver implements StackResolver {
  private readonly stacks: Record<string, Stack> = {};

  /**
   * Initialize with a root stack
   */
  constructor(
    private readonly rootStack: Stack,
    private readonly attributionMetadataStorage: AttributionMetadataStorage
  ) {}

  /**
   * Proxy to getStackFor that appends attribution metadata for custom stacks
   */
  getCustomStack = (name: string): Stack => {
    const stack = this.getStackFor(name);
    // this is safe even if stack is cached from an earlier invocation because storeAttributionMetadata is a noop if the stack description already exists
    this.attributionMetadataStorage.storeAttributionMetadata(
      stack,
      `custom`,
      fileURLToPath(new URL('../../package.json', import.meta.url))
    );
    return stack;
  };

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
