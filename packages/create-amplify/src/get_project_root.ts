import fsp from 'fs/promises';
import path from 'path';
import yargs from 'yargs';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import { logger } from './logger.js';

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
    logger.debug(`The provided directory (${projectRoot}) does not exist.`);
    logger.debug(`Creating directory ${projectRoot}`);
    await fsp.mkdir(projectRoot, { recursive: true });
  }
  return projectRoot;
};
