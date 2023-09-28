import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
/**
 * Factory to create a CloudFormationClientFactory
 */
export class CloudFormationClientFactory {
  /**
   * Returns a single instance of DeploymentClient
   */
  static getInstance = (
    credentials: AwsCredentialIdentityProvider
  ): CloudFormationClient => {
    return new CloudFormationClient(credentials);
  };
}
