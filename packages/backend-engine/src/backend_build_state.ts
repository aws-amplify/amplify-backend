import { NestedStack, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ConstructInitializer } from './construct_factory.js';

/**
 * Vends Constructs based on a token and a generator function
 */
export type ConstructCache = {
  getOrCompute(initializer: ConstructInitializer<Construct>): Construct;
};

/**
 * Vends stacks for a resource grouping
 */
export type StackResolver = {
  getStackFor(resourceGroupName: string): Stack;
};

/**
 * Serves as a DI container and shared state store for initializing Amplify constructs
 */
export class SingletonConstructCache implements ConstructCache {
  // uses the initializer as the map key. The value is what the initializer returned the first time it was seen
  private readonly constructCache: Map<
    ConstructInitializer<Construct>,
    Construct
  > = new Map();

  /**
   * Initialize the BackendBuildState with a root stack
   */
  constructor(private readonly stackResolver: StackResolver) {}

  /**
   * If a construct for token has already been generated, returns the cached instance.
   * Otherwise, calls the generator to initialize a construct for token, caches it and returns it.
   */
  getOrCompute(initializer: ConstructInitializer<Construct>): Construct {
    if (!this.constructCache.has(initializer)) {
      const scope = this.stackResolver.getStackFor(
        initializer.resourceGroupName
      );
      this.constructCache.set(
        initializer,
        initializer.initializeInScope(scope)
      );
    }
    return this.constructCache.get(initializer) as Construct;
  }
}

/**
 * Vends and caches nested stacks under a provided root stack
 */
export class NestedStackResolver implements StackResolver {
  private readonly stacks: Record<string, Stack> = {};
  /**
   * Initialize with a root stack
   */
  constructor(private readonly rootStack: Stack) {}

  /**
   * Returns a cached NestedStack if resourceGroupName has been seen before
   * Otherwise, creates a new NestedStack, caches it and returns it
   */
  getStackFor(resourceGroupName: string): Stack {
    if (!this.stacks[resourceGroupName]) {
      this.stacks[resourceGroupName] = new NestedStack(
        this.rootStack,
        `${resourceGroupName}Stack`
      );
    }
    return this.stacks[resourceGroupName];
  }
}
