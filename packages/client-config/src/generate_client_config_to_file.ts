import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import {
  BackendIdentifier,
  generateClientConfig,
} from './generate_client_config.js';
import { ClientConfigWriter } from './client-config-writer/client_config_writer.js';

/**
 * Main entry point for generating client config and writing to a file
 */
export const generateClientConfigToFile = async (
  credentialProvider: AwsCredentialIdentityProvider,
  backendIdentifier: BackendIdentifier,
  targetPath: string
): Promise<void> => {
  const clientConfigWriter = new ClientConfigWriter();

  const clientConfig = await generateClientConfig(
    credentialProvider,
    backendIdentifier
  );
  await clientConfigWriter.writeClientConfig(clientConfig, targetPath);
};
