import { ConstructCache } from './construct_cache.js';
import { Construct } from 'constructs';
import { OutputStorageStrategy } from './output_storage_stragegy.js';

/**
 * Functional interface for construct factories. All objects in the backend-engine definition must implement this interface.
 */
export type ConstructFactory<Instance extends Construct> = {
  getInstance(
    resolver: ConstructCache,
    outputStorageStrategy: OutputStorageStrategy
  ): Instance;
};
