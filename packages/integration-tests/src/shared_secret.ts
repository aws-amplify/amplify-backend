import { shortUuid } from './short_uuid.js';

/**
 * Create a unique shared secret name
 */
const createAmplifySharedSecretName = (): string => {
  return 'amplifySharedSecret' + shortUuid();
};

/**
 * Create an environment object with a shared secret
 */
export const createSharedSecretEnvObject = (): Record<string, string> => {
  const sharedSecretName = createAmplifySharedSecretName();
  return {
    amplifySharedSecretNameKey: sharedSecretName,
  };
};

export const amplifySharedSecretNameKey = 'AMPLIFY_SHARED_SECRET_NAME';
