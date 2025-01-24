import { DefaultAuthClient } from './auth_client.js';
import { AuthClient } from './types.js';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

//may need an additional function for setting up the session
/**
 * sets up auth client
 */
//eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getAuthClient = (outputs: any): AuthClient => {
  return new DefaultAuthClient(
    new CognitoIdentityProviderClient(),
    outputs['auth']
  );
};
