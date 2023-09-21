import {
  BackendOutputEntry,
  GenericBackendOutputEntry,
} from './backend_output.js';

/**
 * Type for an object that collects output data from constructs
 */
export type BackendOutputStorageStrategy<T extends BackendOutputEntry> = {
  addBackendOutputEntry: (keyName: string, backendOutputEntry: T) => void;
  flush: () => void;
};

/**
 * This interface should be kept in sync with the above type, but without the generic type args.
 * This is because this interface is used by JSII classes which does not support generics
 */
export interface GenericBackendOutputStorageStrategy {
  addBackendOutputEntry(
    keyName: string,
    backendOutputEntry: GenericBackendOutputEntry
  ): void;

  flush(): void;
}
