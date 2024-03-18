import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { generateClientConfig } from './generate_client_config.js';
import { ClientConfigWriter } from './client-config-writer/client_config_writer.js';
import { ClientConfigFormat } from './client-config-types/client_config.js';
import { getClientConfigPath } from './paths/index.js';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { ClientConfigFormatter } from './client-config-writer/client_config_formatter.js';
import { ClientConfigConverter } from './client-config-writer/client_config_converter.js';
import { fileURLToPath } from 'url';
import * as fsp from 'fs/promises';

/**
 * Main entry point for generating client config and writing to a file
 */
export const generateClientConfigToFile = async (
  credentialProvider: AwsCredentialIdentityProvider,
  backendIdentifier: DeployedBackendIdentifier,
  outDir?: string,
  format?: ClientConfigFormat,
  // TODO: update this type when Printer interface gets defined in platform-core.
  log?: (message: string) => void,
  debug?: (message: string) => void
): Promise<void> => {
  const packageJson = await readPackageJson();

  const clientConfigWriter = new ClientConfigWriter(
    getClientConfigPath,
    new ClientConfigFormatter(
      new ClientConfigConverter(packageJson.name, packageJson.version)
    )
  );

  const clientConfig = await generateClientConfig(
    credentialProvider,
    backendIdentifier
  );
  await clientConfigWriter.writeClientConfig(
    clientConfig,
    outDir,
    format,
    log,
    debug
  );
};

const readPackageJson = async (): Promise<{
  name: string;
  version: string;
}> => {
  const packageJsonPath = fileURLToPath(
    new URL('../package.json', import.meta.url)
  );
  return JSON.parse(await fsp.readFile(packageJsonPath, 'utf-8'));
};
