import {
  ClientConfig,
  ClientConfigFormat,
  ClientConfigVersion,
  generateClientConfig,
  generateClientConfigToFile,
} from '@aws-amplify/client-config';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { printer } from '@aws-amplify/cli-core';
import { AWSClientProvider } from '@aws-amplify/plugin-types';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

/**
 * Adapts static generateClientConfigToFile from @aws-amplify/client-config call to make it injectable and testable.
 */
export class ClientConfigGeneratorAdapter {
  /**
   * Creates new adapter for generateClientConfigToFile from @aws-amplify/client-config.
   */
  constructor(
    private readonly awsClientProvider: AWSClientProvider<{
      getS3Client: S3Client;
      getAmplifyClient: AmplifyClient;
      getCloudFormationClient: CloudFormationClient;
    }>
  ) {}
  /**
   * Generates the client configuration for a given backend
   */
  generateClientConfig = async (
    backendIdentifier: DeployedBackendIdentifier,
    version: ClientConfigVersion
  ): Promise<ClientConfig> => {
    return generateClientConfig(
      backendIdentifier,
      version,
      this.awsClientProvider
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
      backendIdentifier,
      version,
      outDir,
      format,
      this.awsClientProvider
    );

    filesWritten.forEach((file) => printer.log(`File written: ${file}`));
  };
}
