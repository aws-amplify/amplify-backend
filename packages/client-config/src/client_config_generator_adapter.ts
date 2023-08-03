import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import {
  BackendIdentifier,
  generateClientConfig,
} from './generate_client_config.js';
import { ClientConfig } from './index.js';

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
