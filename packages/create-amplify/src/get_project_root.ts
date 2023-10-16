import fsp from 'fs/promises';
import path from 'path';
import { AmplifyPrompter } from './amplify_prompts.js';
import { getArgs } from './get_args.js';

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
    if (
      getArgs().flags.includes('debug') ||
      getArgs().flags.includes('verbose')
    ) {
      console.log(`⚠️ The provided directory (${projectRoot}) does not exist.`);
      console.log(`🗂️ Creating directory ${projectRoot}`);
    }
    await fsp.mkdir(projectRoot, { recursive: true });
  }
  return projectRoot;
};
