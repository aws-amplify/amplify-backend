import { BackendIdentifierParts } from '@aws-amplify/plugin-types';

/**
 * Serialize BackendIdentifierParts into a CFN stack name
 */
export const backendIdentifierPartsToStackName = (
  parts: BackendIdentifierParts
): string => ['amplify', parts.namespace, parts.instance, parts.type].join('-');
