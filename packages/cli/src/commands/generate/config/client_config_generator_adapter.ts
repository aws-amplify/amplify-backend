import {
  BackendIdentifier,
  ClientConfig,
  generateClientConfig,
  generateClientConfigToFile,
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
    private readonly awsCredentialProvider: AwsCredentialIdentityProvider
  ) {}
  /**
   * Generates the client configuration for a given backend
   */
  generateClientConfig = async (
    backendIdentifier: BackendIdentifier
  ): Promise<ClientConfig> => {
    return generateClientConfig(this.awsCredentialProvider, backendIdentifier);
  };

  /**
   * Calls generateClientConfigToFile from @aws-amplify/client-config.
   * @deprecated
   * @see generateClientConfigToFile for more information.
   */
  generateClientConfigToFile = async (
    backendIdentifier: BackendIdentifier,
    targetPath: string
  ): Promise<void> => {
    await generateClientConfigToFile(
      this.awsCredentialProvider,
      backendIdentifier,
      targetPath
    );
  };
}
