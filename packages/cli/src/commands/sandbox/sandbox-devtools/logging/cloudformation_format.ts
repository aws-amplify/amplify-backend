import { normalizeCDKConstructPath } from '@aws-amplify/cli-core';

/**
 * Creates a friendly name for a resource, using CDK metadata when available.
 * @param logicalId The logical ID of the resource
 * @param metadata Optional CDK metadata that may contain construct path
 * @param metadata.constructPath Optional construct path from CDK metadata
 * @returns A user-friendly name for the resource
 *
 *   - "TodoTable" → "Todo Table"
 *   - "TodoIAMRole2DA8E66E" → "Todo IAM Role"
 *   - "amplifyDataGraphQLAPI42A6FA33" → "Data GraphQLAPI"
 *   - "testNameBucketPolicyA5C458BB" → "test Name Bucket Policy"
 */
export const createFriendlyName = (
  logicalId: string,
  metadata?: { constructPath?: string },
): string => {
  // If we have CDK metadata with a construct path, use it
  if (metadata?.constructPath) {
    return normalizeCDKConstructPath(metadata.constructPath);
  }

  // Fall back to the basic transformation
  let name = logicalId.replace(/^amplify/, '').replace(/^Amplify/, ''); // Remove 'amplify' prefix

  // Improve readability by adding spaces between lowercase and uppercase transitions
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Add spaces before uppercase letters that follow another uppercase
  name = name.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');

  // Remove CloudFormation resource IDs (alphanumeric suffixes)
  name = name.replace(/[0-9A-F]{6,}$/g, '');

  // Clean up spacing and remove leftover single letters (like "A", "B", "C")
  name = name.replace(/\s[A-Z]\s/g, ' ').replace(/\s[A-Z]$/g, '');
  name = name.replace(/\s+/g, ' ').trim();

  const result = name || logicalId;
  return result;
};
