import path from 'path';

export const configFileName = 'amplifyconfiguration';
export enum FormatOption {
  JS = 'js',
  JSON = 'json',
  TS = 'ts',
}
export const formatChoices = Object.values(FormatOption);

/**
 * Get path to config file
 * @param out - path to directory where config is written. If not provided defaults to current process working directory.
 * @param format - The format which the configuration should be exported into. Defaults to js.
 * returns path to config file
 */
export const getConfigPath = (
  out: string | undefined,
  format: (typeof formatChoices)[number] | undefined
) => {
  const defaultArgs = {
    out: process.cwd(),
    format: FormatOption.JS,
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
