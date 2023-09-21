import {
  ClientConfigFormat,
  generateClientConfigToFile,
} from '@aws-amplify/client-config';
import { BackendIdentifier } from '@aws-amplify/deployed-backend-client';
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
    outDir?: string,
    format?: ClientConfigFormat
  ): Promise<void> => {
    await generateClientConfigToFile(
      this.awsCredentialProvider,
      backendIdentifier,
      outDir,
      format
    );
  };
}
