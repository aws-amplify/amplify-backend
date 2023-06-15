import { BackendOutput } from './backend_output.js';

/**
 * Interface for classes that can fetch outputs for an Amplify backend
 */
export type BackendOutputRetrievalStrategy = {
  /**
   * Get all the output associated with the backend
   */
  fetchBackendOutput(): Promise<BackendOutput>;
};
