import { SSMSecret } from './ssm_secret.js';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';

export interface Secret {
  /**
   * Get secret.
   * @param backendId - The backend ID. It is an appID for CI/CD and [package.json#name]-[whoami] for sandbox.
   * @param secretName - The secret name.
   * @param branchName - (optional) The branch name. Use 'sandbox' for sandbox environment. If absent, the function
   * will retrieve an app-level secret.
   */
  getSecret(
    backendId: string,
    secretName: string,
    branchName?: string
  ): Promise<string | undefined>;
}

/**
 * Creates an Amplify secret client.
 */
export const SecretClient = (
  credentialProvider?: AwsCredentialIdentityProvider
): Secret => {
  return new SSMSecret(credentialProvider);
};
