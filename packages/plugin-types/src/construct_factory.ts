import { type ConstructContainer } from './construct_container.js';
import { type BackendOutputStorageStrategy } from './output_storage_strategy.js';
import { type BackendOutputEntry } from './backend_output.js';
import { type ImportPathVerifier } from './import_path_verifier.js';

export type ConstructFactoryGetInstanceProps = {
  constructContainer: ConstructContainer;
  outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  importPathVerifier?: ImportPathVerifier;
};

/**
 * Functional interface for construct factories. All objects in the backend-engine definition must implement this interface.
 */
export type ConstructFactory<T = unknown> = {
  /**
   * A construct factory can register that the return value implements additional interfaces
   * Registering as a provider allows other construct factories to fetch this one based on the provides token
   */
  readonly provides?: string;
  getInstance: (props: ConstructFactoryGetInstanceProps) => T;
};
