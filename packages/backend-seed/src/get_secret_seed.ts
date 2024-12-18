//import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { getSecretClientWithAmplifyErrorHandling } from '@aws-amplify/backend-secret';

//ultimately want the API to look something like this: getSecret(secretName)
//eslint-disable-next-line jsdoc/require-description
/**
 *
 */
export const GetSeedSecret = async (secretName: string): Promise<string> => {
  //need to get access to the BackendIdentifier
  const backendId = new BackendIdResolver(); //this does not work
  const secretClient = getSecretClientWithAmplifyErrorHandling();
  const secret = await secretClient.getSecret(backendId, { name: secretName });
  return secret.value;
};
