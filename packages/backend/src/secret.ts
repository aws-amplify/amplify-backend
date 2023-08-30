import { BackendParameter } from '@aws-amplify/plugin-types';
import { BackendParameterImpl } from './engine/backend_parameters/backend_parameter.js';

/**
 * Factory function for initializing a backend secret.
 */
export const secret = (name: string): BackendParameter =>
  new BackendParameterImpl(name);
