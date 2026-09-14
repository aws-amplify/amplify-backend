import {
  ClientConfig,
  ClientConfigFormat,
  ClientConfigVersion,
  ClientConfigVersionOption,
  DEFAULT_CLIENT_CONFIG_VERSION,
  GenerateClientConfigToFileResult,
} from './client-config-types/client_config.js';
import { writeClientConfigToFile } from './write_client_config_to_file.js';

/**
 * Main entry point for generating client config and writing to a file
 */
export const generateEmptyClientConfigToFile = async (
  version: ClientConfigVersion,
  outDir?: string,
  format?: ClientConfigFormat,
): Promise<GenerateClientConfigToFileResult> => {
  // The emitted schema version is derived from the requested version. Legacy
  // (V0) has no unified schema of its own and is converted from the latest
  // unified config, so it carries DEFAULT_CLIENT_CONFIG_VERSION.
  const bodyVersion =
    version === ClientConfigVersionOption.V0
      ? DEFAULT_CLIENT_CONFIG_VERSION
      : version;
  const clientConfig: ClientConfig = {
    version: bodyVersion,
  } as ClientConfig;
  return writeClientConfigToFile(clientConfig, version, outDir, format);
};
