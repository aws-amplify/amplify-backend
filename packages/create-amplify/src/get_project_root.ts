import fsp from 'fs/promises';
import path from 'path';
import yargs from 'yargs';
import { AmplifyPrompter } from './amplify_prompts.js';

const argv = await yargs(process.argv.slice(2)).options({
  debug: {
    type: 'boolean',
    default: false,
  },
  verbose: {
    type: 'boolean',
    default: false,
  },
}).argv;

/**
 * Returns the project root directory.
 */
export const getProjectRoot = async () => {
  const useDefault = process.env.npm_config_yes === 'true';
  const defaultProjectRoot = '.';
  let projectRoot = useDefault
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
    if (argv.debug || argv.verbose) {
      console.info(
        `⚠️ The provided directory (${projectRoot}) does not exist.`
      );
      console.info(`🗂️ Creating directory ${projectRoot}`);
    }
    await fsp.mkdir(projectRoot, { recursive: true });
  }
  return projectRoot;
};
