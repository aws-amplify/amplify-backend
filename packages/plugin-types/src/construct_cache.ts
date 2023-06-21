import { Construct } from 'constructs';
import { Provider } from './provider.js';

/**
 * Initializes a CDK Construct in a given scope
 */
export type ConstructCacheEntryGenerator = {
  /**
   * A group name for this generator.
   * This is used by the cache to determine which stack to place the generated construct in
   */
  resourceGroupName: string;

  /**
   * Create a new instance of a CDK construct in the provided scope.
   */
  generateCacheEntry(scope: Construct): Construct;
};

/**
 * Vends Constructs based on an initializer function
 * TODO I'm not going to rename this type yet. Once we land on the approach here, I'll do the rename in a separate PR to avoid blowing up the diff
 */
export type ConstructCache = {
  getOrCompute(generator: ConstructCacheEntryGenerator): Construct;
  registerProvider(token: string, provider: Provider): void;
  getProvider(token: string): Provider;
};
