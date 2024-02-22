import { AmplifyUserError } from '@aws-amplify/platform-core';
import { ownerPathPartToken } from './constants.js';

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
  if (!(path.startsWith('/') && path.endsWith('/*'))) {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `All storage access paths must start with "/" and end with "/*. Found [${path}].`,
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

  // if there's no owner token, we don't need to do any more checks
  if (!path.includes(ownerPathPartToken)) {
    return;
  }

  // owner token checks

  const ownerSplit = path.split(ownerPathPartToken);

  if (ownerSplit.length > 2) {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `The ${ownerPathPartToken} token can only appear once in a path. Found [${path}]`,
      resolution: `Remove all but one occurrence of the ${ownerPathPartToken} token`,
    });
  }

  const [before, after] = ownerSplit;

  if (after !== '/*') {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `The ${ownerPathPartToken} token must be the path part right before the ending wildcard. Found [${path}].`,
      resolution: `Update the path such that the owner token is the last path part before the ending wildcard. For example: "/foo/bar/${ownerPathPartToken}/*.`,
    });
  }

  if (before === '/') {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `The ${ownerPathPartToken} token must not be the first path part. Found [${path}].`,
      resolution: `Add an additional prefix to the path. For example: "/foo/${ownerPathPartToken}/*.`,
    });
  }

  if (!before.endsWith('/')) {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `A path part that includes the ${ownerPathPartToken} token cannot include any other characters. Found [${path}].`,
      resolution: `Remove all other characters from the path part with the ${ownerPathPartToken} token. For example: "/foo/${ownerPathPartToken}/*"`,
    });
  }

  /**
   * If the path includes the owner token, we need to do one more pass through the prefixes where we substitute the owner toke with a * and check for prefixes again
   * This is because the owner token becomes a * for all access except owner rules so we need to make sure there are no other prefix conflicts
   */

  const substitutionPrefixes = getPrefixes(
    path.replace(ownerPathPartToken, '*'),
    allPaths
  );
  if (substitutionPrefixes.length > 0) {
    throw new AmplifyUserError<StorageError>('InvalidStorageAccessPathError', {
      message: `Wildcard conflict detected with an ${ownerPathPartToken} token.`,
      details: `Paths [${substitutionPrefixes.join(
        ', '
      )}] conflicts with ${ownerPathPartToken} token in path [${path}].`,
      resolution: `Update the storage access paths such that no path has a wildcard that conflicts with an ${ownerPathPartToken} token.`,
    });
  }
};

/**
 * Returns a subset of paths where each element is a prefix of path
 * Equivalent paths are NOT considered prefixes of each other (mainly just for simplicity of the calling logic)
 */
const getPrefixes = (path: string, paths: string[]): string[] =>
  paths.filter((p) => path !== p && path.startsWith(p.replace('*', '')));

type StorageError = 'InvalidStorageAccessPathError';
