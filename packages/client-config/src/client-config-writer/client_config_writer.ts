import _fsp from 'fs/promises';
import {
  ClientConfig,
  ClientConfigFormat,
} from '../client-config-types/client_config.js';
import { ClientConfigFormatter } from './client_config_formatter.js';

export type ClientConfigPathResolver = (
  outDir?: string,
  format?: ClientConfigFormat
) => Promise<string>;

/**
 * A class that persists client config to disk.
 */
export class ClientConfigWriter {
  /**
   * Creates client config writer
   */
  constructor(
    private readonly pathResolver: ClientConfigPathResolver,
    private readonly formatter: ClientConfigFormatter,
    private readonly fsp = _fsp
  ) {}
  /**
   * Persists provided client config as json file to target path.
   */
  writeClientConfig = async (
    clientConfig: ClientConfig,
    outDir?: string,
    format: ClientConfigFormat = ClientConfigFormat.JSON
  ): Promise<void> => {
    const targetPath = await this.pathResolver(outDir, format);
    const fileContent = this.formatter.format(clientConfig, format);
    await this.fsp.writeFile(targetPath, fileContent);
  };
}
