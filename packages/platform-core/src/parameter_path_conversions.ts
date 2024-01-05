import { AppId, BackendIdentifier } from '@aws-amplify/plugin-types';
import { BackendIdentifierConversions } from './backend_identifier_conversions.js';

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
  // round trip the backend id through the stack name conversion to ensure we are applying the same sanitization to SSM paths
  const sanitizedBackendId = BackendIdentifierConversions.fromStackName(
    BackendIdentifierConversions.toStackName(parts)
  );
  if (!sanitizedBackendId || !sanitizedBackendId.hash) {
    // this *should* never happen
    throw new Error(
      `Could not sanitize the backendId to construct the parameter path`
    );
  }
  return `/amplify/${sanitizedBackendId.namespace}/${sanitizedBackendId.name}-${sanitizedBackendId.type}-${sanitizedBackendId.hash}`;
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
