import { v5 as uuidV5 } from 'uuid';
import { homedir } from 'os';
import { configControllerFactory } from '../config/local_configuration_controller_factory';
import path from 'path';

// eslint-disable-next-line spellcheck/spell-checker
const AMPLIFY_CLI_UUID_NAMESPACE = 'e6831f35-ca7a-4889-a7bf-541c81d58d40'; // A random v4 UUID
/**
 * Generates a consistent project Uuid
 */
export const getLocalProjectId = async (
  namespace: string = AMPLIFY_CLI_UUID_NAMESPACE,
) => {
  const localProjectIdPath =
    process.cwd().replace(homedir() + path.sep, '') + '.projectId';
  const configController = configControllerFactory.getInstance(
    'usage_data_preferences.json',
  );

  const cachedProjectId =
    await configController.get<string>(localProjectIdPath);

  if (cachedProjectId) {
    return cachedProjectId;
  }

  const projectId = uuidV5(Date.now().toString(), namespace);
  await configController.set(localProjectIdPath, projectId);

  return projectId;
};
