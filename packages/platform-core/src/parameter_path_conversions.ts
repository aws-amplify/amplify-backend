import { AppId, BackendIdentifier } from '@aws-amplify/plugin-types';

const SHARED_SECRET = 'shared';

/**
 * Provides static methods for converting BackendIdentifier to parameter path strings
 */
export class ParameterPathConversions {
  /**
   * Convert a BackendIdentifier to a parameter prefix.
   */
  static toParameterPrefix(backendId: BackendIdentifier | AppId): string {
    if (typeof backendId === 'object') {
      return getBranchParameterPrefix(backendId);
    }
    return getSharedParameterPrefix(backendId);
  }

  /**
   * Convert a BackendIdentifier to a parameter full path.
   */
  static toParameterFullPath(
    backendId: BackendIdentifier | AppId,
    secretName: string
  ): string {
    if (typeof backendId === 'object') {
      return getBranchParameterFullPath(backendId, secretName);
    }
    return getSharedParameterFullPath(backendId, secretName);
  }
}

/**
 * Get a branch-specific parameter prefix.
 */
const getBranchParameterPrefix = (parts: BackendIdentifier): string => {
  return `/amplify/${parts.namespace}/${parts.name}`;
};

/**
 * Get a branch-specific parameter full path.
 */
const getBranchParameterFullPath = (
  backendIdentifier: BackendIdentifier,
  secretName: string
): string => {
  return `${getBranchParameterPrefix(backendIdentifier)}/${secretName}`;
};

/**
 * Get a shared parameter prefix.
 */
const getSharedParameterPrefix = (appId: AppId): string => {
  return `/amplify/${SHARED_SECRET}/${appId}`;
};

/**
 * Get a shared parameter full path.
 */
const getSharedParameterFullPath = (
  appId: AppId,
  secretName: string
): string => {
  return `${getSharedParameterPrefix(appId)}/${secretName}`;
};
