import {
  BackendIdentifier,
  ClientConfig,
  generateClientConfig,
} from '@aws-amplify/client-config';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';

/**
 * Adapts static generateClientConfig from @aws-amplify/client-config call to make it injectable and testable.
 */
export class ClientConfigGeneratorAdapter {
  /**
   * Creates new adapter for generateClientConfig from @aws-amplify/client-config.
   */
  constructor(
    private readonly awsCredentialProvider: AwsCredentialIdentityProvider
  ) {}
  /**
   * Calls generateClientConfig from @aws-amplify/client-config.
   * @see generateClientConfig for more information.
   */
  async generateClientConfig(
    backendIdentifier: BackendIdentifier
  ): Promise<ClientConfig> {
    return generateClientConfig(this.awsCredentialProvider, backendIdentifier);
  }
}
