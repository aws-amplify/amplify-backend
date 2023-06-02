import { Construct } from 'constructs';
import { StackResolver } from './nested_stack_resolver.js';
import {
  AmplifyConstruct,
  ConstructCache,
  ConstructCacheEntryGenerator,
} from '@aws-amplify/plugin-types';

/**
 * Serves as a DI container and shared state store for initializing Amplify constructs
 */
export class SingletonConstructCache implements ConstructCache {
  // uses the CacheEntryGenerator as the map key. The value is what the generator returned the first time it was seen
  private readonly constructCache: Map<
    ConstructCacheEntryGenerator,
    Construct
  > = new Map();

  /**
   * Initialize the BackendBuildState with a root stack
   */
  constructor(private readonly stackResolver: StackResolver) {}

  /**
   * If generator has been seen before, the cached Construct instance is returned
   * Otherwise, the generator is called and the value is cached and returned
   */
  getOrCompute(generator: ConstructCacheEntryGenerator): AmplifyConstruct {
    if (!this.constructCache.has(generator)) {
      const scope = this.stackResolver.getStackFor(generator.resourceGroupName);
      this.constructCache.set(generator, generator.generateCacheEntry(scope));
    }
    return this.constructCache.get(generator) as AmplifyConstruct;
  }
}
