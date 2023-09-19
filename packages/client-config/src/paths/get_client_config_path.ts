import path from 'path';

export const configFileName = 'amplifyconfiguration';
export enum FormatChoice {
  JS = 'js',
  JSON = 'json',
  TS = 'ts',
}
export const formatChoices = Object.values(FormatChoice);

/**
 * Get path to config file
 * @param out - path to directory where config is written. If not provided defaults to current process working directory.
 * @param format - The format which the configuration should be exported into. Defaults to js.
 * returns path to config file
 */
export const getClientConfigPath = (out?: string, format?: FormatChoice) => {
  const defaultArgs = {
    out: process.cwd(),
    format: FormatChoice.JS,
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
