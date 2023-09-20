import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import {
  BackendIdentifier,
  generateClientConfig,
} from './generate_client_config.js';
import { ClientConfigWriter } from './client-config-writer/client_config_writer.js';
import { ClientConfigFormat } from './client-config-types/client_config.js';
import { getClientConfigPath } from './paths/index.js';

/**
 * Main entry point for generating client config and writing to a file
 */
export const generateClientConfigToFile = async (
  credentialProvider: AwsCredentialIdentityProvider,
  backendIdentifier: BackendIdentifier,
  out?: string,
  format?: ClientConfigFormat
): Promise<void> => {
  const clientConfigWriter = new ClientConfigWriter();

  const clientConfig = await generateClientConfig(
    credentialProvider,
    backendIdentifier
  );
  const targetPath = getClientConfigPath(out, format);
  await clientConfigWriter.writeClientConfig(clientConfig, targetPath);
};
