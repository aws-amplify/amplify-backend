import {
  AppendableBackendOutputEntry,
  BackendOutputEntry,
} from './backend_output.js';

/**
 * Type for an object that collects output data from constructs
 */
export type BackendOutputStorageStrategy<T extends BackendOutputEntry> = {
  addBackendOutputEntry: (keyName: string, backendOutputEntry: T) => void;
  addAppendableBackendOutputEntry: <U extends BackendOutputEntry>(
    keyName: string,
    initialEntry: U
  ) => AppendableBackendOutputEntry<U>;
};
