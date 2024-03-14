import _fsp from 'fs/promises';
import path from 'path';
import {
  ClientConfig,
  ClientConfigFileBaseName,
  ClientConfigFormat,
} from '../client-config-types/client_config.js';
import { ClientConfigFormatter } from './client_config_formatter.js';

export type ClientConfigPathResolver = (
  fileName: ClientConfigFileBaseName,
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
    clientConfigFileName: ClientConfigFileBaseName,
    outDir?: string,
    format: ClientConfigFormat = ClientConfigFormat.JSON,
    // TODO: update this type when Printer interface gets defined in platform-core.
    log?: (message: string) => void
  ): Promise<void> => {
    const targetPath = await this.pathResolver(
      clientConfigFileName,
      outDir,
      format
    );
    const fileContent = this.formatter.format(clientConfig, format);
    await this.fsp.writeFile(targetPath, fileContent);
    log?.(`File written: ${path.relative(process.cwd(), targetPath)}`);
  };
}
