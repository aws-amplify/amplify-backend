import _fsp from 'fs/promises';
import path from 'path';
import {
  ClientConfig,
  ClientConfigFileBaseName,
  ClientConfigFormat,
  ClientConfigVersion,
  GenerateClientConfigToFileResult,
} from '../client-config-types/client_config.js';
import { ClientConfigFormatter } from './client_config_formatter.js';

export type ClientConfigPathResolver = (
  fileName: ClientConfigFileBaseName,
  outDir?: string,
  format?: ClientConfigFormat
) => Promise<string>;

export type ClientConfigNameResolver = (
  version: ClientConfigVersion
) => ClientConfigFileBaseName;

/**
 * A class that persists client config to disk.
 */
export class ClientConfigWriter {
  /**
   * Creates client config writer
   */
  constructor(
    private readonly pathResolver: ClientConfigPathResolver,
    private readonly nameResolver: ClientConfigNameResolver,
    private readonly formatter: ClientConfigFormatter,
    private readonly fsp = _fsp
  ) {}
  /**
   * Persists provided client config as json file to target path.
   */
  writeClientConfig = async (
    clientConfig: ClientConfig,
    version: ClientConfigVersion,
    outDir?: string,
    format: ClientConfigFormat = ClientConfigFormat.JSON
  ): Promise<GenerateClientConfigToFileResult> => {
    const targetPath = await this.pathResolver(
      this.nameResolver(version),
      outDir,
      format
    );
    const fileContent = this.formatter.format(clientConfig, format);
    await this.fsp.writeFile(targetPath, fileContent);

    return {
      filesWritten: [path.relative(process.cwd(), targetPath)],
    };
  };
}
