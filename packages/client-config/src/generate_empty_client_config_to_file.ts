import {
  ClientConfig,
  ClientConfigFormat,
  ClientConfigVersion,
  GenerateClientConfigToFileResult,
} from './client-config-types/client_config.js';
import { writeClientConfigToFile } from './write_client_config_to_file.js';

/**
 * Main entry point for generating client config and writing to a file
 */
export const generateEmptyClientConfigToFile = async (
  version: ClientConfigVersion,
  outDir?: string,
  format?: ClientConfigFormat
): Promise<GenerateClientConfigToFileResult> => {
  const clientConfig: ClientConfig = {
    version: '1',
  };
  return writeClientConfigToFile(clientConfig, version, outDir, format);
};
