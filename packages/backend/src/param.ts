import { BackendParameter } from '@aws-amplify/plugin-types';
import { SSMBackendParameter } from '@aws-amplify/backend-engine';

/**
 * Factory function for initializing a BackendParameter
 */
export const param = (name: string, version = 1): BackendParameter =>
  new SSMBackendParameter(name, version);
