/**
 *
 */
import { BackendIdentifierParts } from '@aws-amplify/plugin-types';

/**
 * Deserialize a stack name into BackendIdentifierParts
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
  const [amplifyPrefix, namespace, instance, type] = parts;
  if (amplifyPrefix !== 'amplify') {
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
