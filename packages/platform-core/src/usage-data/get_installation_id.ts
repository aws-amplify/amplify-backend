import { userInfo } from 'os';
import { v5 as uuidV5 } from 'uuid';
import { CwdPackageJsonReader } from '../cwd_package_json_reader.js';

// eslint-disable-next-line spellcheck/spell-checker
const AMPLIFY_CLI_UUID_NAMESPACE = 'e7368840-2eb6-4042-99b4-9d6c2a9370e6'; // A random v4 UUID
/**
 * Generates a consistent installation Uuid from the cwd + packageJsonName + userName
 */
export const getInstallationUuid = (
  namespace: string = AMPLIFY_CLI_UUID_NAMESPACE
) => {
  const packageJsonName = new CwdPackageJsonReader().read().name;
  const userName = userInfo().username;
  const modulePath = __dirname;

  return uuidV5(modulePath + packageJsonName + userName, namespace);
};
