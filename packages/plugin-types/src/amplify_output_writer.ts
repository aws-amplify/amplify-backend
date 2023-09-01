import { BackendOutputStorageStrategy } from './output_storage_strategy.js';
import { BackendOutputEntry } from './backend_output.js';

/**
 * Functional interface for constructs that provide Amplify output
 */
export type BackendOutputWriter = {
  storeOutput: (
    outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>
  ) => void;
};
