import {
  ClientConfig,
  ClientConfigFormat,
  ClientConfigVersion,
  generateClientConfig,
  generateClientConfigToFile,
} from '@aws-amplify/client-config';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { printer } from '@aws-amplify/cli-core';
import { AWSClientProvider } from '@aws-amplify/platform-core';

/**
 * Adapts static generateClientConfigToFile from @aws-amplify/client-config call to make it injectable and testable.
 */
export class ClientConfigGeneratorAdapter {
  /**
   * Creates new adapter for generateClientConfigToFile from @aws-amplify/client-config.
   */
  constructor(private readonly awsClientProvider: AWSClientProvider) {}
  /**
   * Generates the client configuration for a given backend
   */
  generateClientConfig = async (
    backendIdentifier: DeployedBackendIdentifier,
    version: ClientConfigVersion
  ): Promise<ClientConfig> => {
    return generateClientConfig(
      this.awsClientProvider,
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
      this.awsClientProvider,
      backendIdentifier,
      version,
      outDir,
      format
    );

    filesWritten.forEach((file) => printer.log(`File written: ${file}`));
  };
}
