import {
  ClientConfig,
  ClientConfigFormat,
  ClientConfigVersion,
  generateClientConfig,
  generateClientConfigToFile,
} from '@aws-amplify/client-config';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { printer } from '@aws-amplify/cli-core';

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
    backendIdentifier: DeployedBackendIdentifier,
    version: ClientConfigVersion
  ): Promise<ClientConfig> => {
    return generateClientConfig(
      this.awsCredentialProvider,
      backendIdentifier,
      version
    );
  };

  /**
   * Calls generateClientConfigToFile from @aws-amplify/client-config.
   * @see generateClientConfigToFile for more information.
   */
  generateClientConfigToFile = async (
    backendIdentifier: DeployedBackendIdentifier,
    version: ClientConfigVersion,
    outDir?: string,
    format?: ClientConfigFormat
  ): Promise<void> => {
    const { filesWritten } = await generateClientConfigToFile(
      this.awsCredentialProvider,
      backendIdentifier,
      version,
      outDir,
      format
    );

    filesWritten.forEach((file) => printer.log(`File written: ${file}`));
  };
}
