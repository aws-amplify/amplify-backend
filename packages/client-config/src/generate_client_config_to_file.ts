import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { generateClientConfig } from './generate_client_config.js';
import {
  ClientConfigFormat,
  ClientConfigVersion,
  GenerateClientConfigToFileResult,
} from './client-config-types/client_config.js';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { writeClientConfigToFile } from './write_client_config_to_file.js';

/**
 * Main entry point for generating client config and writing to a file
 */
export const generateClientConfigToFile = async (
  credentialProvider: AwsCredentialIdentityProvider,
  backendIdentifier: DeployedBackendIdentifier,
  version: ClientConfigVersion,
  outDir?: string,
  format?: ClientConfigFormat
): Promise<GenerateClientConfigToFileResult> => {
  const clientConfig = await generateClientConfig(
    credentialProvider,
    backendIdentifier,
    version
  );

  return await writeClientConfigToFile(clientConfig, version, outDir, format);
};
