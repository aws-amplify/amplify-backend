import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { generateClientConfig } from './generate_client_config.js';
import { ClientConfigWriter } from './client-config-writer/client_config_writer.js';
import {
  ClientConfigFormat,
  ClientConfigVersion,
  ClientConfigVersions,
} from './client-config-types/client_config.js';
import { getClientConfigPath } from './paths/index.js';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { ClientConfigMobileConverter } from './client-config-writer/client_config_to_mobile_legacy_converter.js';
import { fileURLToPath } from 'url';
import * as fsp from 'fs/promises';
import { ClientConfigFormatterLegacy } from './client-config-writer/client_config_formatter_legacy.js';
import { ClientConfigFormatterGen2 } from './client-config-writer/client_config_formatter_gen2.js';
import { getClientConfigFileName } from './paths/get_client_config_name.js';

/**
 * Main entry point for generating client config and writing to a file
 */
export const generateClientConfigToFile = async (
  credentialProvider: AwsCredentialIdentityProvider,
  backendIdentifier: DeployedBackendIdentifier,
  version: ClientConfigVersion,
  outDir?: string,
  format?: ClientConfigFormat,
  // TODO: update this type when Printer interface gets defined in platform-core.
  log?: (message: string) => void
): Promise<void> => {
  const packageJson = await readPackageJson();

  const isLegacyConfig = version === ClientConfigVersions.LEGACY;

  const clientConfigWriter = new ClientConfigWriter(
    getClientConfigPath,
    isLegacyConfig
      ? new ClientConfigFormatterLegacy(
          new ClientConfigMobileConverter(packageJson.name, packageJson.version)
        )
      : new ClientConfigFormatterGen2()
  );

  const clientConfig = await generateClientConfig(
    credentialProvider,
    backendIdentifier,
    version
  );

  const fileName = getClientConfigFileName(version);

  await clientConfigWriter.writeClientConfig(
    clientConfig,
    fileName,
    outDir,
    format,
    log
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
