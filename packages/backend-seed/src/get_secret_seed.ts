import { getSecretClientWithAmplifyErrorHandling } from '@aws-amplify/backend-secret';

//eslint-disable-next-line jsdoc/require-description
/**
 *
 */
export const GetSeedSecret = async (secretName: string): Promise<string> => {
  const serializedBackendId = process.env.SANDBOX_IDENTIFIER;
  if (!serializedBackendId) {
    throw new Error(
      'SANDBOX_IDENTIFIER is undefined. Have you run ampx sandbox seed yet?'
    );
  }
  const backendId = JSON.parse(serializedBackendId);
  const secretClient = getSecretClientWithAmplifyErrorHandling();
  const secret = await secretClient.getSecret(backendId, { name: secretName });
  return secret.value;
};
