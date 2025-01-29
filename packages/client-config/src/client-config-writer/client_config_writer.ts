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
import { AmplifyUserError } from '@aws-amplify/platform-core';

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
    try {
      await this.fsp.writeFile(targetPath, fileContent);
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('EACCES')) {
        throw new AmplifyUserError(
          'PermissionsError',
          {
            message: `You do not have the permissions to write to this file: ${targetPath}`,
            resolution: `Ensure that you have the right permissions to write to ${targetPath}`,
          },
          error
        );
      } else {
        throw error;
      }
    }

    return {
      filesWritten: [path.relative(process.cwd(), targetPath)],
    };
  };
}
