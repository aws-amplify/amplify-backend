import { BackendOutputEntry } from './backend_output.js';

// TODO: move this somewhere else
export type  DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Type for an object that collects output data from constructs
 */
export type BackendOutputStorageStrategy<T extends BackendOutputEntry> = {
  addBackendOutputEntry: (keyName: string, backendOutputEntry: T) => void;
  appendToBackendOutputList: (keyName: string, backendOutputEntry: DeepPartial<T>) => void;
};
