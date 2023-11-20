/**
 * Interface for classes that can fetch outputs for an Amplify backend
 */
import { type BackendOutput } from './backend_output.js';

export type BackendOutputRetrievalStrategy = {
  /**
   * Get all the output associated with the backend
   */
  fetchBackendOutput: () => Promise<BackendOutput>;
};
