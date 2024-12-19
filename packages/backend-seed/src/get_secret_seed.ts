import { getSecretClientWithAmplifyErrorHandling } from '@aws-amplify/backend-secret';

//eslint-disable-next-line jsdoc/require-description
/**
 *
 */
export const GetSeedSecret = async (secretName: string): Promise<string> => {
  const envObject: string = JSON.parse(
    process.env.AMPLIFY_SSM_ENV_CONFIG ?? '{}'
  );

  //eslint-disable-next-line no-console
  console.log(`Sandbox ID: ${envObject}`);
  if (!envObject) {
    throw new Error(
      'SANDBOX_IDENTIFIER is undefined. Have you run ampx sandbox seed yet?'
    );
  }

  const secretClient = getSecretClientWithAmplifyErrorHandling();
  const secret = await secretClient.getSecret(envObject, { name: secretName });
  return secret.value;
};
