import { AmplifyPrompter } from './amplify_prompts.js';

/**
 * Returns the project root directory.
 */
export const getProjectRoot = async () => {
  const useDefault = process.env.npm_config_yes === 'true';
  const defaultProjectRoot = '.';
  const projectRoot = useDefault
    ? defaultProjectRoot
    : await AmplifyPrompter.input({
        message: 'Where should we create your project?',
        defaultValue: defaultProjectRoot,
      });
  return projectRoot;
};
