import { ClientConfigWriter } from './client-config-writer/client_config_writer.js';
import {
  ClientConfig,
  ClientConfigFormat,
  ClientConfigVersion,
  ClientConfigVersionOption,
  GenerateClientConfigToFileResult,
} from './client-config-types/client_config.js';
import { getClientConfigPath } from './paths/index.js';
import { ClientConfigMobileConverter } from './client-config-writer/client_config_to_mobile_legacy_converter.js';
import { fileURLToPath } from 'url';
import * as fsp from 'fs/promises';
import { ClientConfigFormatterLegacy } from './client-config-writer/client_config_formatter_legacy.js';
import { ClientConfigFormatterDefault } from './client-config-writer/client_config_formatter_default.js';
import { getClientConfigFileName } from './paths/get_client_config_name.js';

/**
 * Main entry point for writing provided client config to a file
 */
export const writeClientConfigToFile = async (
  clientConfig: ClientConfig,
  version: ClientConfigVersion,
  outDir?: string,
  format?: ClientConfigFormat
): Promise<GenerateClientConfigToFileResult> => {
  const packageJson = await readPackageJson();

  const isLegacyConfig = version === ClientConfigVersionOption.V0;

  const clientConfigWriter = new ClientConfigWriter(
    getClientConfigPath,
    getClientConfigFileName,
    isLegacyConfig
      ? new ClientConfigFormatterLegacy(
          new ClientConfigMobileConverter(packageJson.name, packageJson.version)
        )
      : new ClientConfigFormatterDefault()
  );

  return await clientConfigWriter.writeClientConfig(
    clientConfig,
    version,
    outDir,
    format
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
