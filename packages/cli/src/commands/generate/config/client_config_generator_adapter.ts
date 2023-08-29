import {
  BackendIdentifier,
  generateClientConfig as generateConfig,
  ClientConfig,
  ClientConfigWriter,
} from '@aws-amplify/client-config';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';

/**
 * Adapts static generateClientConfigToFile from @aws-amplify/client-config call to make it injectable and testable.
 */
export class ClientConfigGeneratorAdapter {
  /**
   * Creates new adapter for generateClientConfigToFile from @aws-amplify/client-config.
   */
  constructor(
    private readonly awsCredentialProvider: AwsCredentialIdentityProvider,
    private readonly clientConfigWriter: ClientConfigWriter
  ) {}
  /**
   * Generates the client configuration for a given backend
   */
  async generateClientConfig(
    backendIdentifier: BackendIdentifier
  ): Promise<ClientConfig> {
    return generateConfig(this.awsCredentialProvider, backendIdentifier);
  }

  /**
   * Calls generateClientConfigToFile from @aws-amplify/client-config.
   * @deprecated
   * @see generateClientConfigToFile for more information.
   */
  async generateClientConfigToFile(
    backendIdentifier: BackendIdentifier,
    targetPath: string
  ): Promise<void> {
    const clientConfig = await this.generateClientConfig(backendIdentifier);
    this.clientConfigWriter.writeClientConfig(clientConfig, targetPath);
  }
}
