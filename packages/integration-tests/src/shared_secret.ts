import { shortUuid } from './short_uuid.js';

/**
 * Create a unique shared secret name
 */
export const createAmplifySharedSecretName = (): string => {
  return 'amplifySharedSecret' + shortUuid();
};

export const amplifySharedSecretNameKey = 'AMPLIFY_SHARED_SECRET_NAME';
