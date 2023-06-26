import { ConstructContainer } from './construct_container.js';
import { BackendOutputStorageStrategy } from './output_storage_stragegy.js';

/**
 * Functional interface for construct factories. All objects in the backend-engine definition must implement this interface.
 */
export type ConstructFactory<T = unknown> = {
  /**
   * A construct factory can register that the return value implements additional interfaces
   * Registering as a provider allows other construct factories to fetch this one based on the provides token
   */
  readonly provides?: string;
  getInstance(
    constructContainer: ConstructContainer,
    outputStorageStrategy: BackendOutputStorageStrategy
  ): T;
};
