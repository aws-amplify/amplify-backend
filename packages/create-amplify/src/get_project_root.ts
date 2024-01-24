import fsp from 'fs/promises';
import path from 'path';
import { AmplifyPrompter, LogLevel } from '@aws-amplify/cli-core';
import { printer } from './printer.js';

/**
 * Returns the project root directory.
 */
export const getProjectRoot = async () => {
  const useDefault = process.env.npm_config_yes === 'true';
  const defaultProjectRoot = '.';
  let projectRoot: string = useDefault
    ? defaultProjectRoot
    : await AmplifyPrompter.input({
        message: 'Where should we create your project?',
        defaultValue: defaultProjectRoot,
      });

  projectRoot = path.isAbsolute(projectRoot)
    ? projectRoot
    : path.resolve(process.cwd(), projectRoot);

  const isExistProjectRoot = await fsp
    .stat(projectRoot)
    .then(() => true)
    .catch(() => false); // There's no `fsp.exists` method, so we use `stat` instead. See https://github.com/nodejs/node/issues/39960#issuecomment-909444667
  if (!isExistProjectRoot) {
    printer.log(
      `The provided directory (${projectRoot}) does not exist.`,
      LogLevel.DEBUG
    );
    printer.log(`Creating directory ${projectRoot}`, LogLevel.DEBUG);
    try {
      await fsp.mkdir(projectRoot, { recursive: true });
    } catch (err) {
      if (path.isAbsolute(projectRoot)) {
        printer.log(
          `Failed to create directory at ${projectRoot}. Ensure this is the correct path and you have write permissions to this location.`,
          LogLevel.ERROR
        );
      }
      throw err;
    }
  }
  return projectRoot;
};
