import { BackendOutputEntry } from './backend_output_entry.js';

/**
 * Interface for classes that can fetch outputs for an Amplify backend
 */
export type BackendOutputRetrievalStrategy = {
  /**
   * Get all the output associated with the backend
   */
  fetchBackendOutput(): Promise<BackendOutputEntry[]>;
};
