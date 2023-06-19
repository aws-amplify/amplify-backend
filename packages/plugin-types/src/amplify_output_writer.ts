import { BackendOutputStorageStrategy } from './output_storage_stragegy.js';

/**
 * Functional interface for constructs that provide Amplify output
 */
export type BackendOutputWriter = {
  storeOutput(outputStorageStrategy: BackendOutputStorageStrategy): void;
};
