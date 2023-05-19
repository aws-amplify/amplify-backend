import { Construct } from 'constructs';
import { StackResolver } from './nested_stack_resolver.js';
import {
  ConstructCache,
  ConstructInitializer,
} from '@aws-amplify/plugin-types';

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
   * If initializer has been seen before, the cached Construct instance is returned
   * Otherwise, the initializer is called and the value is cached and returned
   */
  getOrCompute(initializer: ConstructInitializer<Construct>): Construct {
    if (!this.constructCache.has(initializer)) {
      const scope = this.stackResolver.getStackFor(
        initializer.resourceGroupName
      );
      this.constructCache.set(initializer, initializer.initialize(scope));
    }
    return this.constructCache.get(initializer) as Construct;
  }
}
