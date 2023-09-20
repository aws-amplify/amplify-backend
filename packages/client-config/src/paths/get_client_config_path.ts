import path from 'path';

const configFileName = 'amplifyconfiguration';
export enum ClientConfigFormat {
  JS = 'js',
  JSON = 'json',
  TS = 'ts',
}

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

  let targetPath: string;
  if (out) {
    targetPath = path.isAbsolute(out) ? out : path.resolve(process.cwd(), out);
  } else {
    targetPath = defaultArgs.out;
  }

  targetPath = path.resolve(
    targetPath,
    `${configFileName}.${format || defaultArgs.format}`
  );
  return targetPath;
};
