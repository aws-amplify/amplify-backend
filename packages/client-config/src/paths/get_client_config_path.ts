import path from 'path';
import { ClientConfigFormat } from '../index.js';

const configFileName = 'amplifyconfiguration';

/**
 * Get path to config file
 * @param out - path to directory where config is written. If not provided defaults to current process working directory.
 * @param format - The format which the configuration should be exported into. Defaults to js.
 * returns path to config file
 */
export const getClientConfigPath = (
  out?: string,
  format?: ClientConfigFormat
) => {
  const defaultArgs = {
    out: process.cwd(),
    format: ClientConfigFormat.JS,
  };

  let targetPath = defaultArgs.out;
  let providedFilename = '';

  if (out) {
    if (path.extname(out)) {
      targetPath = path.isAbsolute(out)
        ? path.dirname(out)
        : path.resolve(process.cwd(), path.dirname(out));
      providedFilename = path.basename(out);
    } else {
      targetPath = path.isAbsolute(out)
        ? out
        : path.resolve(process.cwd(), out);
    }
  }

  const defaultFilename = `${configFileName}.${format || defaultArgs.format}`;

  targetPath = path.resolve(
    targetPath,
    providedFilename && !format ? providedFilename : defaultFilename // if custom filename is provided in `--out` and format is not provided, use the provided filename
  );
  return targetPath;
};
