import { v5 as uuidV5 } from 'uuid';
import { hostname } from 'os';

// eslint-disable-next-line spellcheck/spell-checker
const AMPLIFY_CLI_UUID_NAMESPACE = 'e6831f35-ca7a-4889-a7bf-541c81d58d40'; // A random v4 UUID
/**
 * Generates a consistent installation Uuid from the library installation path + machine's host name
 */
export const getLocalProjectUuid = (
  namespace: string = AMPLIFY_CLI_UUID_NAMESPACE
) => {
  return uuidV5(__dirname + hostname(), namespace);
};
