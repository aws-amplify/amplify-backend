import fs from 'fs';
import path from 'path';
import { ClientConfigFormat } from '../index.js';

const configFileName = 'amplifyconfiguration';

/**
 * Get path to config file
 * @param outDir - path to directory where config is written. If not provided defaults to current process working directory.
 * @param format - The format which the configuration should be exported into. Defaults to JSON.
 * returns path to config file
 */
export const getClientConfigPath = async (
  outDir?: string,
  format?: ClientConfigFormat
) => {
  const defaultArgs = {
    out: process.cwd(),
    format: ClientConfigFormat.JSON,
  };

  let targetPath = defaultArgs.out;

  if (outDir) {
    const outDirIsFile = fs.lstatSync(outDir).isFile();
    if (!outDirIsFile) {
      targetPath = path.isAbsolute(outDir)
        ? outDir
        : path.resolve(process.cwd(), outDir);
    }
  }

  targetPath = path.resolve(
    targetPath,
    `${configFileName}.${format || defaultArgs.format}`
  );
  return targetPath;
};
