import { getSecretClientWithAmplifyErrorHandling } from '@aws-amplify/backend-secret';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

//eslint-disable-next-line jsdoc/require-description
/**
 *
 */
export const GetSeedSecret = async (secretName: string): Promise<string> => {
  if (!process.env.AMPLIFY_SANDBOX_IDENTIFIER) {
    throw new Error(
      'SANDBOX_IDENTIFIER is undefined. Have you run ampx sandbox seed yet?'
    );
  }
  const backendId: BackendIdentifier = JSON.parse(
    process.env.AMPLIFY_SANDBOX_IDENTIFIER
  );

  //eslint-disable-next-line no-console
  console.log(`Sandbox ID: ${backendId.name}`);

  const secretClient = getSecretClientWithAmplifyErrorHandling();
  const secret = await secretClient.getSecret(backendId, { name: secretName });
  return secret.value;
};
