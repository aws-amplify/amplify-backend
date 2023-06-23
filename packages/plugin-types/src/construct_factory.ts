import { ConstructCache } from './construct_cache.js';
import { Construct } from 'constructs';
import { BackendOutputStorageStrategy } from './output_storage_stragegy.js';

/**
 * Functional interface for construct factories. All objects in the backend-engine definition must implement this interface.
 */
export type ConstructFactory<Instance extends Construct> = {
  /**
   * A construct factory can register that the return value implements additional interfaces
   * Registering as a provider allows other construct factories to fetch this one based on the provides token
   *
   * See ProviderFactory
   */
  provides?: string;
  getInstance(
    cache: ConstructCache,
    outputStorageStrategy: BackendOutputStorageStrategy
  ): Instance;
};
