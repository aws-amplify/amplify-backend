import { entityIdPathToken } from './constants.js';

/**
 * Validate that the storage path record keys match our conventions and restrictions.
 * If all of the paths are valid, this function is a noop.
 * If some path is invalid, an error is thrown with details
 */
export const validateStorageAccessPaths = (storagePaths: string[]) => {
  storagePaths.forEach((path, index) =>
    validateStoragePath(path, index, storagePaths),
  );
};

const validateStoragePath = (
  path: string,
  index: number,
  allPaths: string[],
) => {
  if (path.startsWith('/')) {
    throw new Error(
      `Storage access paths must not start with "/". Found [${path}].`,
    );
  }
  if (!path.endsWith('/*')) {
    throw new Error(
      `Storage access paths must end with "/*". Found [${path}].`,
    );
  }

  if (path.includes('//')) {
    throw new Error(`Path cannot contain "//". Found [${path}].`);
  }

  if (path.indexOf('*') < path.length - 1) {
    throw new Error(
      `Wildcards are only allowed as the final part of a path. Found [${path}].`,
    );
  }

  /**
   * For any path, at most one other path can be a prefix of that path
   */
  const otherPrefixes = getPrefixes(path, allPaths);
  if (otherPrefixes.length > 1) {
    throw new Error(
      `For any given path, only one other path can be a prefix of it. Found [${path}] which has prefixes [${otherPrefixes.join(', ')}].`,
    );
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
    throw new Error(
      `A path cannot be a prefix of another path that contains the ${entityIdPathToken} token. Found [${path}] which has prefixes [${otherPrefixes.join(', ')}].`,
    );
  }

  const ownerSplit = path.split(entityIdPathToken);

  if (ownerSplit.length > 2) {
    throw new Error(
      `The ${entityIdPathToken} token can only appear once in a path. Found [${path}]`,
    );
  }

  const [substringBeforeOwnerToken, substringAfterOwnerToken] = ownerSplit;

  if (substringAfterOwnerToken !== '/*') {
    throw new Error(
      `The ${entityIdPathToken} token must be the path part right before the ending wildcard. Found [${path}].`,
    );
  }

  if (substringBeforeOwnerToken === '') {
    throw new Error(
      `The ${entityIdPathToken} token must not be the first path part. Found [${path}].`,
    );
  }

  if (!substringBeforeOwnerToken.endsWith('/')) {
    throw new Error(
      `A path part that includes the ${entityIdPathToken} token cannot include any other characters. Found [${path}].`,
    );
  }
};

/**
 * Returns a subset of paths where each element is a prefix of path
 * Equivalent paths are NOT considered prefixes of each other
 */
const getPrefixes = (
  path: string,
  paths: string[],
  treatWildcardAsLiteral = false,
): string[] =>
  paths.filter(
    (p) =>
      path !== p &&
      path.startsWith(treatWildcardAsLiteral ? p : p.replaceAll('*', '')),
  );
