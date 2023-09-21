import path from 'path';
import { ClientConfigFormat } from '../index.js';

const configFileName = 'amplifyconfiguration';

/**
 * Get path to config file
 * @param outDir - path to directory where config is written. If not provided defaults to current process working directory.
 * @param format - The format which the configuration should be exported into. Defaults to js.
 * returns path to config file
 */
export const getClientConfigPath = (
  outDir?: string,
  format?: ClientConfigFormat
) => {
  const defaultArgs = {
    out: process.cwd(),
    format: ClientConfigFormat.JS,
  };

  let targetPath = defaultArgs.out;

  if (outDir) {
    if (path.extname(outDir)) {
      throw new Error(
        'Provided path should be a directory without a file name'
      );
    } else {
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
