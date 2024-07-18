import { BackendOutputEntry } from './backend_output.js';
import { StorageOutputPayloadToStore } from './storage_output_payload_to_store.js';

/**
 * Type for an object that collects output data from constructs
 */
export type BackendOutputStorageStrategy<
  T extends BackendOutputEntry<StorageOutputPayloadToStore>
> = {
  addBackendOutputEntry: (keyName: string, backendOutputEntry: T) => void;
  appendToBackendOutputList: (keyName: string, backendOutputEntry: T) => void;
};
