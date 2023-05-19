import { NestedStack, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Function that initializes a construct in the context of a resolved stack
 */
export type ConstructGeneratorFunction = (
  stackResolver: StackResolver
) => Construct;

/**
 * Vends Constructs based on a token and a generator function
 */
export type ConstructResolver = {
  resolve(token: string, generator: ConstructGeneratorFunction): Construct;
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
export class BackendBuildState implements ConstructResolver, StackResolver {
  private readonly stacks: Record<string, Stack> = {};
  private readonly constructInstances: Record<string, Construct> = {};

  /**
   * Initialize the BackendBuildState with a root stack
   */
  constructor(private readonly rootStack: Stack) {}

  /**
   * If a construct for token has already been generated, returns the cached instance.
   * Otherwise, calls the generator to initialize a construct for token, caches it and returns it.
   */
  resolve(token: string, generator: ConstructGeneratorFunction): Construct {
    if (!this.constructInstances[token]) {
      this.constructInstances[token] = generator(this);
    }
    return this.constructInstances[token];
  }

  /**
   * Vends stacks for resourceGroupNames. Each resourceGroupName will get its own nested stack under the root stack
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
