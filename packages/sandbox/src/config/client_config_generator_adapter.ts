import {
  BackendIdentifier,
  ClientConfigWriter,
  generateClientConfig,
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
    private readonly configWriter: ClientConfigWriter
  ) {}
  /**
   * Calls generateClientConfigToFile from @aws-amplify/client-config.
   * @see generateClientConfigToFile for more information.
   */
  generateClientConfigToFile = async (
    backendIdentifier: BackendIdentifier,
    targetPath: string
  ): Promise<void> => {
    const clientConfig = await generateClientConfig(
      this.awsCredentialProvider,
      backendIdentifier
    );
    this.configWriter.writeClientConfig(clientConfig, targetPath);
  };
}
