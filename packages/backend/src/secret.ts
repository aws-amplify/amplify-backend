import { BackendSecret } from '@aws-amplify/plugin-types';
import { BaseBackendSecret } from './engine/backend-secret/backend_secret.js';

/**
 * Factory function for initializing a backend secret.
 */
export const secret = (name: string): BackendSecret =>
  new BaseBackendSecret(name);
