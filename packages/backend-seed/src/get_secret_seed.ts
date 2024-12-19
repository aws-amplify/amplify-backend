import { getSecretClientWithAmplifyErrorHandling } from '@aws-amplify/backend-secret';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

//eslint-disable-next-line jsdoc/require-description
/**
 *
 */
export const GetSeedSecret = async (secretName: string): Promise<string> => {
  const backendId: BackendIdentifier = JSON.parse(
    process.env.SANDBOX_IDENTIFIER ?? '{}'
  );

  //eslint-disable-next-line no-console
  console.log(`Sandbox ID: ${backendId.name}`);
  if (!backendId) {
    throw new Error(
      'SANDBOX_IDENTIFIER is undefined. Have you run ampx sandbox seed yet?'
    );
  }

  const secretClient = getSecretClientWithAmplifyErrorHandling();
  const secret = await secretClient.getSecret(backendId, { name: secretName });
  return secret.value;
};
