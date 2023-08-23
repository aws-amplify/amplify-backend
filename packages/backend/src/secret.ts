import { BackendParameter } from '@aws-amplify/plugin-types';
import { SSMBackendParameter } from './engine/backend_parameters/ssm_backend_parameter.js';

/**
 * Factory function for initializing a backend secret.
 */
export const secret = (name: string, version = 1): BackendParameter =>
  new SSMBackendParameter(name, version);
