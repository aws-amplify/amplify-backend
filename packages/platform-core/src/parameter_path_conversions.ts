import { AppId, BackendIdentifier } from '@aws-amplify/plugin-types';
import { BackendIdentifierConversions } from './backend_identifier_conversions.js';
import { AmplifyFault } from './errors';

const SHARED_SECRET = 'shared';
const RESOURCE_REFERENCE = 'resource_reference';

/**
 * Provides static methods for converting BackendIdentifier to parameter path strings
 */
export class ParameterPathConversions {
  /**
   * Convert a BackendIdentifier to a parameter prefix.
   */
  // It's fine to ignore the rule here because the anti-static rule is to ban the static function which should use constructor
  // eslint-disable-next-line no-restricted-syntax
  static toParameterPrefix(backendId: BackendIdentifier | AppId): string {
    if (typeof backendId === 'object') {
      return getBackendParameterPrefix(backendId);
    }
    return getSharedParameterPrefix(backendId);
  }

  /**
   * Convert a BackendIdentifier to a parameter full path.
   */
  // It's fine to ignore the rule here because the anti-static rule is to ban the static function which should use constructor
  // eslint-disable-next-line no-restricted-syntax
  static toParameterFullPath(
    backendId: BackendIdentifier | AppId,
    parameterName: string
  ): string {
    if (typeof backendId === 'object') {
      return getBackendParameterFullPath(backendId, parameterName);
    }
    return getSharedParameterFullPath(backendId, parameterName);
  }

  /**
   * Generate an SSM path for references to other backend resources
   */
  // It's fine to ignore the rule here because the anti-static rule is to ban the static function which should use constructor
  // eslint-disable-next-line no-restricted-syntax
  static toResourceReferenceFullPath(
    backendId: BackendIdentifier,
    referenceName: string
  ): string {
    return `/amplify/${RESOURCE_REFERENCE}/${getBackendIdentifierPathPart(
      backendId
    )}/${referenceName}`;
  }
}

const getBackendParameterPrefix = (parts: BackendIdentifier): string => {
  return `/amplify/${getBackendIdentifierPathPart(parts)}`;
};

/**
 * Get a branch-specific parameter prefix.
 */
const getBackendIdentifierPathPart = (parts: BackendIdentifier): string => {
  // round trip the backend id through the stack name conversion to ensure we are applying the same sanitization to SSM paths
  const sanitizedBackendId = BackendIdentifierConversions.fromStackName(
    BackendIdentifierConversions.toStackName(parts)
  );
  if (!sanitizedBackendId || !sanitizedBackendId.hash) {
    // this *should* never happen
    throw new AmplifyFault('BackendIdConversionFault', {
      message: `Could not sanitize the backendId to construct the parameter path`,
    });
  }
  return `${sanitizedBackendId.namespace}/${sanitizedBackendId.name}-${sanitizedBackendId.type}-${sanitizedBackendId.hash}`;
};

/**
 * Get a branch-specific parameter full path.
 */
const getBackendParameterFullPath = (
  backendIdentifier: BackendIdentifier,
  parameterName: string
): string => {
  return `${getBackendParameterPrefix(backendIdentifier)}/${parameterName}`;
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
  parameterName: string
): string => {
  return `${getSharedParameterPrefix(appId)}/${parameterName}`;
};
