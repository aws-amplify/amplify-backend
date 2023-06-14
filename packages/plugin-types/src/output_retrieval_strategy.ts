import { AmplifyBackendOutput } from './amplify_backend_output.js';

/**
 * Interface for classes that can fetch outputs for an Amplify backend
 */
export type OutputRetrievalStrategy = {
  /**
   * Get all the output associated with the backend
   */
  fetchAllOutput(): Promise<AmplifyBackendOutput>;
};
