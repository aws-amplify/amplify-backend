import fsp from 'fs/promises';
import path from 'path';
import { ClientConfigFileBaseName, ClientConfigFormat } from '../index.js';
import { homedir } from 'os';

/**
 * Get path to config file
 * @param fileName - name of the file to be used for client config. Can be different based on the version of the client config.
 * @param outDir - path to directory where config is written. If not provided defaults to current process working directory.
 * @param format - The format which the configuration should be exported into. Defaults to JSON.
 * returns path to config file
 */
export const getClientConfigPath = async (
  fileName: ClientConfigFileBaseName,
  outDir?: string,
  format?: ClientConfigFormat
) => {
  const defaultArgs = {
    out: process.cwd(),
    format: ClientConfigFormat.JSON,
  };
  format = format || defaultArgs.format;

  let targetPath = defaultArgs.out;

  if (outDir) {
    // if outDir starts with "~/" or "~$" or "~\" replace tilde with home directory
    const outDirNoTilde = outDir.replace(/^~(?=$|\/|\\)/, homedir());
    targetPath = path.isAbsolute(outDirNoTilde)
      ? outDirNoTilde
      : path.resolve(process.cwd(), outDirNoTilde);

    try {
      await fsp.access(outDirNoTilde);
    } catch (error) {
      // outDir does not exist, so create dir
      if (error instanceof Error && error.message.includes('ENOENT')) {
        await fsp.mkdir(outDirNoTilde, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  let extension: string;
  switch (format) {
    case ClientConfigFormat.JSON_MOBILE:
      extension = 'json';
      break;
    default:
      extension = format;
      break;
  }

  targetPath = path.resolve(targetPath, `${fileName}.${extension}`);
  return targetPath;
};
