import fs from 'fs';
import path from 'path';
import { ClientConfigFileBaseName, ClientConfigFormat } from '../index.js';

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
    const outDirIsFile = fs.lstatSync(outDir).isFile();
    if (!outDirIsFile) {
      targetPath = path.isAbsolute(outDir)
        ? outDir
        : path.resolve(process.cwd(), outDir);
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
