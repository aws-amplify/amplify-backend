import fsp from 'fs/promises';
import path from 'path';
import { ClientConfigFormat } from '../index.js';
import { LogLevel } from '@aws-amplify/cli-core';

const configFileName = 'amplifyconfiguration';

/**
 * Get path to config file
 * @param outDir - path to directory where config is written. If not provided defaults to current process working directory.
 * @param format - The format which the configuration should be exported into. Defaults to JSON.
 * returns path to config file
 */
export const getClientConfigPath = async (
  outDir?: string,
  format?: ClientConfigFormat,
  // TODO: update this type when Printer interface gets defined in platform-core.
  log?: (message: string, logLevel: LogLevel) => void
) => {
  const defaultArgs = {
    out: process.cwd(),
    format: ClientConfigFormat.JSON,
  };
  format = format || defaultArgs.format;

  let targetPath = defaultArgs.out;

  if (outDir) {
    targetPath = path.isAbsolute(outDir)
      ? outDir
      : path.resolve(process.cwd(), outDir);

    const relativeTargetPath = path.relative(process.cwd(), targetPath);
    try {
      log?.(
        `Checking if directory ${relativeTargetPath} exists...`,
        LogLevel.DEBUG
      );
      await fsp.access(outDir);
    } catch (error) {
      // outDir does not exist, so create dir
      await fsp.mkdir(outDir, { recursive: true });
      log?.(`Directory created: ${relativeTargetPath}`, LogLevel.DEBUG);
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

  targetPath = path.resolve(targetPath, `${configFileName}.${extension}`);
  return targetPath;
};
