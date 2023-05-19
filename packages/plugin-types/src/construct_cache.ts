import { Construct } from 'constructs';

/**
 * Initializes a CDK Construct in a given scope
 */
export type ConstructCacheEntryGenerator = {
  /**
   * A group name for this ConstructInitializer.
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
 */
export type ConstructCache = {
  getOrCompute(initializer: ConstructCacheEntryGenerator): Construct;
};
