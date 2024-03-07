import _fsp from 'fs/promises';
import path from 'path';
import {
  ClientConfig,
  ClientConfigFormat,
} from '../client-config-types/client_config.js';
import { ClientConfigFormatter } from './client_config_formatter.js';
import { LogLevel } from '@aws-amplify/cli-core';

export type ClientConfigPathResolver = (
  outDir?: string,
  format?: ClientConfigFormat,
  // TODO: update this type when Printer interface gets defined in platform-core.
  log?: (message: string, logLevel: LogLevel) => void
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
    format: ClientConfigFormat = ClientConfigFormat.JSON,
    // TODO: update this type when Printer interface gets defined in platform-core.
    log?: (message: string, logLevel: LogLevel) => void
  ): Promise<void> => {
    const targetPath = await this.pathResolver(outDir, format, log);
    const fileContent = this.formatter.format(clientConfig, format);
    await this.fsp.writeFile(targetPath, fileContent);
    log?.(
      `File written: ${path.relative(process.cwd(), targetPath)}`,
      LogLevel.INFO
    );
  };
}
