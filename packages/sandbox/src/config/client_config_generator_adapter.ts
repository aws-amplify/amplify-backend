import {
  BackendIdentifier,
  generateClientConfigToFile,
} from '@aws-amplify/client-config';
import { ClientConfigFormat } from '@aws-amplify/client-config/paths';
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
   * Calls generateClientConfigToFile from @aws-amplify/client-config.
   * @see generateClientConfigToFile for more information.
   */
  generateClientConfigToFile = async (
    backendIdentifier: BackendIdentifier,
    out?: string,
    format?: ClientConfigFormat
  ): Promise<void> => {
    await generateClientConfigToFile(
      this.awsCredentialProvider,
      backendIdentifier,
      out,
      format
    );
  };
}
