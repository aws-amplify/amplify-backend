import { generateClientConfig } from './generate_client_config.js';
import {
  ClientConfigFormat,
  ClientConfigVersion,
  GenerateClientConfigToFileResult,
} from './client-config-types/client_config.js';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { AWSClientProvider } from '@aws-amplify/plugin-types';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { S3Client } from '@aws-sdk/client-s3';
import { writeClientConfigToFile } from './write_client_config_to_file.js';

/**
 * Main entry point for generating client config and writing to a file
 */
export const generateClientConfigToFile = async (
  backendIdentifier: DeployedBackendIdentifier,
  version: ClientConfigVersion,
  outDir?: string,
  format?: ClientConfigFormat,
  awsClientProvider?: AWSClientProvider<{
    getS3Client: S3Client;
    getAmplifyClient: AmplifyClient;
    getCloudFormationClient: CloudFormationClient;
  }>
): Promise<GenerateClientConfigToFileResult> => {
  const clientConfig = await generateClientConfig(
    backendIdentifier,
    version,
    awsClientProvider
  );

  return await writeClientConfigToFile(clientConfig, version, outDir, format);
};
