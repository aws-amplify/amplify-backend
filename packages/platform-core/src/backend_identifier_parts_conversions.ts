import { BackendIdentifier } from '@aws-amplify/plugin-types';

const STACK_NAME_LENGTH_LIMIT = 128;
const AMPLIFY_PREFIX = 'amplify';
const NUM_DASHES = 3;

/**
 * Serialize BackendIdentifier into a CFN stack name.
 *
 * Note that this is a LOSSY conversion.
 * Some disallowed characters are removed from the BackendIdentifier when converting to a stack name and long
 * values are truncated to fit in the length constraints
 */
export const backendIdentifierPartsToStackName = (
  parts: BackendIdentifier
): string => {
  // only take the first 50 chars here to make sure there is room in the stack name for the namespace as well
  const instance = removeDisallowedChars(parts.name).slice(0, 50);

  const namespaceMaxLen =
    STACK_NAME_LENGTH_LIMIT -
    AMPLIFY_PREFIX.length -
    parts.type.length -
    instance.length -
    NUM_DASHES -
    1;
  const namespace = removeDisallowedChars(parts.namespace).slice(
    0,
    namespaceMaxLen
  );
  return ['amplify', namespace, instance, parts.type].join('-');
};

/**
 * Deserialize a stack name into BackendIdentifier.
 * This is a loss-less conversion.
 *
 * i.e. `backendIdentifierPartsToStackName(stackNameToBackendIdentifier(stackName)) === stackName`
 */
export const stackNameToBackendIdentifier = (
  stackName?: string
): BackendIdentifier | undefined => {
  if (!stackName) {
    return;
  }
  const parts = stackName.split('-');
  if (parts.length !== 4) {
    return;
  }
  const [prefix, namespace, instance, type] = parts;
  if (prefix !== AMPLIFY_PREFIX) {
    return;
  }
  if (type !== 'sandbox' && type !== 'branch') {
    return;
  }

  return {
    namespace,
    name: instance,
    type: type as 'sandbox' | 'branch',
  };
};

/**
 * Remove all characters that aren't valid in a CFN stack name and remove all dashes as this conflicts with our concatenation convention
 */
const removeDisallowedChars = (str: string): string => {
  return str.replace(/[_/\-.,@ ]/g, '');
};
