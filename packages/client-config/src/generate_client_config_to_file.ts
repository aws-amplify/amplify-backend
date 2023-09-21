import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { generateClientConfig } from './generate_client_config.js';
import { ClientConfigWriter } from './client-config-writer/client_config_writer.js';
import { BackendIdentifier } from '@aws-amplify/deployed-backend-client';

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
