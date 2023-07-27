import {
  BackendIdentifier,
  ClientConfig,
  generateClientConfig,
} from '@aws-amplify/client-config';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';

/**
 * Adapts static generateClientConfig from @aws-amplify/backend-engine call to make it injectable and testable.
 */
export class ClientConfigGeneratorAdapter {
  /**
   * Creates new adapter for generateClientConfig from @aws-amplify/backend-engine.
   */
  constructor(
    private readonly awsCredentialProvider: AwsCredentialIdentityProvider
  ) {}
  /**
   * Calls generateClientConfig from @aws-amplify/backend-engine.
   * @see generateClientConfig for more information.
   */
  async generateClientConfig(
    backendIdentifier: BackendIdentifier
  ): Promise<ClientConfig> {
    return generateClientConfig(this.awsCredentialProvider, backendIdentifier);
  }
}
