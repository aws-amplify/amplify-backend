import { SSM, SSMServiceException } from '@aws-sdk/client-ssm';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { SecretClientError, SecretServerError } from './secret_error.js';

const SHARED_SECRET_BRANCH = '__shared_secret__';

/**
 * This class implements Amplify Secret using SSM parameter store.
 */
export class SSMSecret {
  private readonly ssmClient: SSM;

  /**
   * Creates a new instance of SSMSecret.
   */
  constructor(provider?: AwsCredentialIdentityProvider | SSM) {
    if (provider instanceof SSM) {
      this.ssmClient = provider;
    } else {
      this.ssmClient = new SSM({
        credentials: provider as AwsCredentialIdentityProvider | undefined,
      });
    }
  }

  /**
   * Construct a full paramater name path.
   */
  private getParameterFullPath = (
    backendId: string,
    secretName: string,
    branchName: string = SHARED_SECRET_BRANCH
  ): string => {
    return `/amplify/${backendId}/${branchName}/${secretName}`;
  };

  /**
   * Get secret from SSM parameter store.
   */
  public getSecret = async (
    backendId: string,
    secretName: string,
    branchName?: string
  ): Promise<string | undefined> => {
    const name = this.getParameterFullPath(backendId, secretName, branchName);
    try {
      const resp = await this.ssmClient.getParameter({
        Name: name,
        WithDecryption: true,
      });
      return resp.Parameter?.Value;
    } catch (err) {
      const errMsg = `Failed to retrieve secret '${name}'. Reason: ${JSON.stringify(
        err
      )}`;
      if ((err as SSMServiceException).$fault === 'client') {
        throw new SecretClientError(errMsg);
      } else {
        throw new SecretServerError(errMsg);
      }
    }
  };
}
