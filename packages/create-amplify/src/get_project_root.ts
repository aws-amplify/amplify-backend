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
    : path.resolve(__dirname, projectRoot);
  console.log(`🦋 Creating project in ${projectRoot}`);
  if (!fs.existsSync(projectRoot)) {
    fs.mkdirSync(projectRoot, { recursive: true });
  }
  return projectRoot;
};
