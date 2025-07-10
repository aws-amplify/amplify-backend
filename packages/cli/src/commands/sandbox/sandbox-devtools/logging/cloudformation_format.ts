import { normalizeCDKConstructPath } from '@aws-amplify/cli-core';

/**
 * Creates a friendly name for a resource, using CDK metadata when available.
 * @param logicalId The logical ID of the resource
 * @param metadata Optional CDK metadata that may contain construct path
 * @param metadata.constructPath Optional construct path from CDK metadata
 * @returns A user-friendly name for the resource
 *
 * Examples of friendly names:
 *   - "TodoTable" → "Todo Table"
 *   - "TodoIAMRole2DA8E66E" → "Todo IAM Role"
 *   - "amplifyDataGraphQLAPI42A6FA33" → "Data GraphQLAPI"
 *   - "testNameBucketPolicyA5C458BB" → "test Name Bucket Policy"
 *
 * For construct paths:
 * - amplify-amplify-identifier-sandbox-83e297d0db/data/GraphQLAPI/DefaultApiKey → "Default Api Key"
 * - amplify-amplify-identifier-sandbox-83e297d0db/auth/amplifyAuth/authenticatedUserRole/Resource → "authenticated User Role"
 */
export const createFriendlyName = (
  logicalId: string,
  metadata?: { constructPath?: string },
): string => {
  let name = logicalId;
  if (metadata?.constructPath) {
    const normalizedPath = normalizeCDKConstructPath(metadata.constructPath);
    const parts = normalizedPath.split('/');
    let resourceName = parts.pop();
    while (
      (resourceName === 'Resource' || resourceName === 'Default') &&
      parts.length > 0
    ) {
      resourceName = parts.pop();
    }

    name = resourceName || logicalId;
  }

  // Fall back to the basic transformation
  name = name.replace(/^amplify/, '').replace(/^Amplify/, '');

  name = name.replace(/([a-z])([A-Z])/g, '$1 $2');

  name = name.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');

  // Remove CloudFormation resource IDs (alphanumeric suffixes)
  name = name.replace(/[0-9A-F]{6,}$/g, '');

  name = name.replace(/\s+/g, ' ').trim();

  const result = name || logicalId;
  return result;
};
