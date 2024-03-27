import { AmplifyUserError } from '@aws-amplify/platform-core';
import { entityIdPathToken } from './constants.js';
import { StorageError } from './private_types.js';

/**
 * Validate that the storage path record keys match our conventions and restrictions.
 * If all of the paths are valid, this function is a noop.
 * If some path is invalid, an error is thrown with details
 */
export const validateStorageAccessPaths = (storagePaths: string[]) => {
  storagePaths.forEach(validateStoragePath);
};

const validateStoragePath = (
  path: string,
  index: number,
  allPaths: string[]
) => {
  if (path.startsWith('/')) {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `Storage access paths must not start with "/". Found [${path}].`,
      resolution: 'Update all paths to match the format requirements.',
    });
  }
  if (!path.endsWith('/*')) {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `Storage access paths must end with "/*". Found [${path}].`,
      resolution: 'Update all paths to match the format requirements.',
    });
  }

  if (path.includes('//')) {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `Path cannot contain "//". Found [${path}].`,
      resolution: 'Update all paths to match the format requirements.',
    });
  }

  if (path.indexOf('*') < path.length - 1) {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `Wildcards are only allowed as the final part of a path. Found [${path}].`,
      resolution:
        'Remove all wildcards that are not the final part of the path.',
    });
  }

  /**
   * For any path, at most one other path can be a prefix of that path
   *
   * For example, consider an access definition with the following paths defined:
   * /foo/* - OK (0 other paths are a prefix of this one)
   * /foo/bar/* - OK (1 other path is a prefix of this one)
   * /foo/bar/baz/* - NOT OK (2 other paths are a prefix of this one (/foo and /foo/bar))
   * /foo/baz/* - OK (1 other path is a prefix of this one)
   */
  const otherPrefixes = getPrefixes(path, allPaths);
  if (otherPrefixes.length > 1) {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `For any given path, only one other path can be a prefix of it. Found [${path}] which has prefixes [${otherPrefixes.join(
        ', '
      )}].`,
      resolution: `Update the storage access paths such that any given path has at most one other path that is a prefix.`,
    });
  }

  validateOwnerTokenRules(path, otherPrefixes);
};

/**
 * Extra validations that are only necessary if the path includes an owner token
 */
const validateOwnerTokenRules = (path: string, otherPrefixes: string[]) => {
  // if there's no owner token in the path, this validation is a noop
  if (!path.includes(entityIdPathToken)) {
    return;
  }

  if (otherPrefixes.length > 0) {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `A path cannot be a prefix of another path that contains the ${entityIdPathToken} token.`,
      details: `Found [${path}] which has prefixes [${otherPrefixes.join(
        ', '
      )}].`,
      resolution: `Update the storage access paths such that any given path has at most one other path that is a prefix.`,
    });
  }

  const ownerSplit = path.split(entityIdPathToken);

  if (ownerSplit.length > 2) {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `The ${entityIdPathToken} token can only appear once in a path. Found [${path}]`,
      resolution: `Remove all but one occurrence of the ${entityIdPathToken} token`,
    });
  }

  const [substringBeforeOwnerToken, substringAfterOwnerToken] = ownerSplit;

  if (substringAfterOwnerToken !== '/*') {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `The ${entityIdPathToken} token must be the path part right before the ending wildcard. Found [${path}].`,
      resolution: `Update the path such that the owner token is the last path part before the ending wildcard. For example: "foo/bar/${entityIdPathToken}/*.`,
    });
  }

  if (substringBeforeOwnerToken === '') {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `The ${entityIdPathToken} token must not be the first path part. Found [${path}].`,
      resolution: `Add an additional prefix to the path. For example: "foo/${entityIdPathToken}/*.`,
    });
  }

  if (!substringBeforeOwnerToken.endsWith('/')) {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `A path part that includes the ${entityIdPathToken} token cannot include any other characters. Found [${path}].`,
      resolution: `Remove all other characters from the path part with the ${entityIdPathToken} token. For example: "foo/${entityIdPathToken}/*"`,
    });
  }
};

/**
 * Returns a subset of paths where each element is a prefix of path
 * Equivalent paths are NOT considered prefixes of each other (mainly just for simplicity of the calling logic)
 */
const getPrefixes = (
  path: string,
  paths: string[],
  treatWildcardAsLiteral = false
): string[] =>
  paths.filter(
    (p) =>
      path !== p &&
      path.startsWith(treatWildcardAsLiteral ? p : p.replaceAll('*', ''))
  );
