import fsp from 'fs/promises';
import path from 'path';
import yargs from 'yargs';
import { AmplifyPrompter, LogLevel } from '@aws-amplify/cli-core';
import { printer } from './printer.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';

/**
 * Returns the project root directory.
 */
export const getProjectRoot = async () => {
  const argv = await yargs(process.argv.slice(2)).options({
    yes: {
      type: 'boolean',
      default: false,
    },
  }).argv;
  const useDefault = process.env.npm_config_yes === 'true' || argv.yes === true;
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
      throw new AmplifyUserError('ProjectDirectoryCreateError', {
        message: `Failed to create project directory`,
        resolution: `Ensure that ${projectRoot} is the correct path and you have write permissions to this location.`,
      });
    }
  }
  return projectRoot;
};
