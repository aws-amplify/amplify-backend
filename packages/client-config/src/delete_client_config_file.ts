import fsp from 'fs/promises';
import { ClientConfigFormat } from './client-config-types/client_config.js';
import { getClientConfigPath } from './paths/index.js';

/**
 * Main entry point for deleting client config file from the local file system
 */
export const deleteClientConfigFile = async (
  outDir?: string,
  format?: ClientConfigFormat
): Promise<void> => {
  const targetPath = await getClientConfigPath(outDir, format);
  await fsp.rm(targetPath);
};
