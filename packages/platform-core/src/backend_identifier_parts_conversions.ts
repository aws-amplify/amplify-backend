import { BackendIdentifierParts } from '@aws-amplify/plugin-types';

const STACK_NAME_LENGTH_LIMIT = 128;
const AMPLIFY_PREFIX = 'amplify';
const NUM_DASHES = 3;

/**
 * Serialize BackendIdentifierParts into a CFN stack name.
 *
 * Note that this is a LOSSY conversion.
 * Some disallowed characters are removed from the BackendIdentifierParts when converting to a stack name and long
 * values are truncated to fit in the length constraints
 */
export const backendIdentifierPartsToStackName = (
  parts: BackendIdentifierParts
): string => {
  // only take the first 20 chars here to make sure there is room in the stack name for the namespace as well
  const instance = removeDisallowedChars(parts.instance).slice(0, 20);

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
 * Deserialize a stack name into BackendIdentifierParts.
 * This is a loss-less conversion.
 *
 * i.e. `backendIdentifierPartsToStackName(stackNameToBackendIdentifierParts(stackName)) === stackName`
 */
export const stackNameToBackendIdentifierParts = (
  stackName?: string
): BackendIdentifierParts | undefined => {
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
    instance,
    type: type as 'sandbox' | 'branch',
  };
};

/**
 * Remove all characters that aren't valid in a CFN stack name and remove all dashes as this conflicts with our concatenation convention
 */
const removeDisallowedChars = (str: string): string => {
  return str.replace(/[_/\-.,@ ]/g, '');
};
