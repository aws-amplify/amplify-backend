import fs from 'fs';
import path from 'path';
import { AmplifyPrompter } from './amplify_prompts.js';

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
  if (!fs.existsSync(projectRoot)) {
    console.log(`⚠️ The provided directory (${projectRoot}) does not exist.`);
    console.log(`🗂️ Creating directory ${projectRoot}`);
    fs.mkdirSync(projectRoot, { recursive: true });
  }
  return projectRoot;
};
