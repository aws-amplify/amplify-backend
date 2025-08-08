import { entityIdPathToken } from './constants.js';

/**
 * Validates that storage path record keys match conventions and restrictions.
 * This function ensures that all storage paths are properly formatted and
 * follow the access control rules required for secure S3 access.
 *
 * Validation rules include:
 * - Paths must not start with '/' (S3 object keys don't use leading slashes)
 * - Paths must end with '/*' (wildcard pattern for prefix matching)
 * - Paths cannot contain '//' (invalid S3 key pattern)
 * - Wildcards only allowed at the end
 * - Entity ID token placement restrictions
 * - Hierarchical path relationship limits
 * @param storagePaths - Array of storage path strings to validate
 * @throws {Error} When any path violates the validation rules
 * @example
 * ```typescript
 * // Valid paths
 * validateStorageAccessPaths([
 *   'public/*',
 *   'private/{entity_id}/*',
 *   'admin/reports/*'
 * ]);
 *
 * // Invalid - will throw
 * validateStorageAccessPaths(['/public/*']); // starts with /
 * validateStorageAccessPaths(['public']); // missing /*
 * ```
 */
export const validateStorageAccessPaths = (storagePaths: string[]) => {
  storagePaths.forEach((path, index) =>
    validateStoragePath(path, index, storagePaths),
  );
};

/**
 * Validates a single storage path against all rules and constraints.
 * @param path - The storage path to validate
 * @param index - Index in the array (for error context)
 * @param allPaths - All paths being validated (for relationship checks)
 * @throws {Error} When the path violates any validation rule
 */
const validateStoragePath = (
  path: string,
  index: number,
  allPaths: string[],
) => {
  // Rule 1: Paths must not start with '/'
  // S3 object keys don't use leading slashes
  if (path.startsWith('/')) {
    throw new Error(
      `Storage access paths must not start with "/". Found [${path}].`,
    );
  }

  // Rule 2: Paths must end with '/*'
  // This ensures proper wildcard matching for S3 prefixes
  if (!path.endsWith('/*')) {
    throw new Error(
      `Storage access paths must end with "/*". Found [${path}].`,
    );
  }

  // Rule 3: Paths cannot contain '//'
  // Double slashes create invalid S3 key patterns
  if (path.includes('//')) {
    throw new Error(`Path cannot contain "//". Found [${path}].`);
  }

  // Rule 4: Wildcards only allowed at the end
  // Wildcards in the middle would create ambiguous access patterns
  if (path.indexOf('*') < path.length - 1) {
    throw new Error(
      `Wildcards are only allowed as the final part of a path. Found [${path}].`,
    );
  }

  // Rule 5: Hierarchical relationship constraints
  // For any path, at most one other path can be a prefix of that path
  // This prevents complex overlapping access rules
  const otherPrefixes = getPrefixes(path, allPaths);
  if (otherPrefixes.length > 1) {
    throw new Error(
      `For any given path, only one other path can be a prefix of it. Found [${path}] which has prefixes [${otherPrefixes.join(', ')}].`,
    );
  }

  // Rule 6: Entity ID token validation
  // Special rules apply when paths contain owner access tokens
  validateOwnerTokenRules(path, otherPrefixes);
};

/**
 * Validates rules specific to paths containing entity ID tokens.
 * These rules ensure proper owner-based access control.
 * @param path - The path to validate
 * @param otherPrefixes - Other paths that are prefixes of this path
 * @throws {Error} When entity ID token rules are violated
 */
const validateOwnerTokenRules = (path: string, otherPrefixes: string[]) => {
  // Skip validation if no entity token present
  if (!path.includes(entityIdPathToken)) {
    return;
  }

  // Rule 6a: Entity paths cannot have prefix paths
  // This prevents security issues where parent access could override owner restrictions
  if (otherPrefixes.length > 0) {
    throw new Error(
      `A path cannot be a prefix of another path that contains the ${entityIdPathToken} token.`,
    );
  }

  // Rule 6b: Entity token can only appear once
  // Multiple tokens would create ambiguous substitution
  const ownerSplit = path.split(entityIdPathToken);
  if (ownerSplit.length > 2) {
    throw new Error(
      `The ${entityIdPathToken} token can only appear once in a path. Found [${path}]`,
    );
  }

  const [substringBeforeOwnerToken, substringAfterOwnerToken] = ownerSplit;

  // Rule 6c: Entity token must be right before the ending wildcard
  // This ensures clean path substitution
  if (substringAfterOwnerToken !== '/*') {
    throw new Error(
      `The ${entityIdPathToken} token must be the path part right before the ending wildcard. Found [${path}].`,
    );
  }

  // Rule 6d: Entity token cannot be the first path part
  // Paths must have at least one static prefix
  if (substringBeforeOwnerToken === '') {
    throw new Error(
      `The ${entityIdPathToken} token must not be the first path part. Found [${path}].`,
    );
  }

  // Rule 6e: Entity token must be in its own path segment
  // Cannot mix with other characters in the same segment
  if (!substringBeforeOwnerToken.endsWith('/')) {
    throw new Error(
      `A path part that includes the ${entityIdPathToken} token cannot include any other characters. Found [${path}].`,
    );
  }
};

/**
 * Returns paths that are prefixes of the given path.
 * A prefix path is one where the given path starts with the prefix path.
 * @param path - The path to find prefixes for
 * @param paths - All paths to check against
 * @param treatWildcardAsLiteral - Whether to treat * as literal character
 * @returns Array of paths that are prefixes of the given path
 * @example
 * ```typescript
 * getPrefixes('public/images/*', ['public/*', 'private/*'])
 * // Returns: ['public/*']
 * ```
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
