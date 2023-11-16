import { userInfo } from 'os';
import { v5 as uuidV5 } from 'uuid';

// eslint-disable-next-line spellcheck/spell-checker
const AMPLIFY_CLI_UUID_NAMESPACE = 'e7368840-2eb6-4042-99b4-9d6c2a9370e6'; // A random v4 UUID
/**
 * Generates a consistent installation Uuid from the library installation path + userName
 */
export const getInstallationUuid = (
  namespace: string = AMPLIFY_CLI_UUID_NAMESPACE
) => {
  const userName = userInfo().username;
  const modulePath = __dirname;

  return uuidV5(modulePath + userName, namespace);
};
