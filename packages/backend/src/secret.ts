import { BackendSecret } from '@aws-amplify/plugin-types';
import { CfnTokenBackendSecret } from './engine/backend-secret/backend_secret.js';

/**
 * Factory function for initializing a backend secret.
 */
export const secret = (name: string): BackendSecret =>
  new CfnTokenBackendSecret(name);
