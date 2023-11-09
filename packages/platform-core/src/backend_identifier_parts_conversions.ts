import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { createHash } from 'crypto';

const STACK_NAME_LENGTH_LIMIT = 128;
const AMPLIFY_PREFIX = 'amplify';
const HASH_LENGTH = 10;
const NUM_DASHES = 4;

/**
 * Provides static methods for converting BackendIdentifier to/from a stack name string
 */
export class BackendIdentifierConversions {
  /**
   * Convert a stack name to a BackendIdentifier
   *
   * If the stack name is ambiguous, undefined is returned
   */
  static fromStackName(stackName?: string): BackendIdentifier | undefined {
    if (!stackName) {
      return;
    }
    const parts = stackName.split('-');
    if (parts.length !== 5) {
      return;
    }
    const [prefix, namespace, instance, type, hash] = parts;
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
      hash,
    };
  }

  /**
   * Convert a BackendIdentifier to a stack name
   */
  static toStackName(backendId: BackendIdentifier): string {
    const hash = getHash(backendId);

    // only take the first 50 chars here to make sure there is room in the stack name for the namespace as well
    const name = removeDisallowedChars(backendId.name).slice(0, 50);

    const namespaceMaxLength =
      STACK_NAME_LENGTH_LIMIT -
      AMPLIFY_PREFIX.length -
      backendId.type.length -
      name.length -
      NUM_DASHES -
      HASH_LENGTH;

    const namespace = removeDisallowedChars(backendId.namespace).slice(
      0,
      namespaceMaxLength - 1
    );

    return ['amplify', namespace, name, backendId.type, hash].join('-');
  }
}

/**
 * Gets a stable hash from the namespace and name in the backendId.
 *
 * If the backendId already includes a hash, this hash is returned as-is.
 *
 * !!!DANGER!!!
 * !!!DO NOT CHANGE THIS UNLESS YOU ARE 100% SURE YOU UNDERSTAND THE CONSEQUENCES!!!
 *
 * Changing this hash algorithm will change how stack names are generated which would be a massive breaking change for existing Amplify stacks.
 */
const getHash = (backendId: BackendIdentifier): string =>
  backendId.hash ??
  // md5 would be sufficient here because this hash does not need to be cryptographically secure, but this ensures that we don't get unnecessarily flagged by some security scanner
  createHash('sha512')
    .update(backendId.namespace)
    .update(backendId.name)
    .digest('base64')
    .slice(0, HASH_LENGTH);

/**
 * Remove all characters that aren't valid in a CFN stack name and remove all dashes as this conflicts with our concatenation convention
 */
const removeDisallowedChars = (str: string): string => {
  return str.replace(/[_/\-.,@ ]/g, '');
};
