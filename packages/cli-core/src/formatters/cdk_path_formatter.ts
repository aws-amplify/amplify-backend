/**
 * Utilities for formatting CDK paths and constructs
 */

/**
 * Normalizes a CDK construct path to create a more readable friendly name
 * @param constructPath The CDK construct path
 * @returns A normalized construct path
 */
export const normalizeCDKConstructPath = (constructPath: string): string => {
  // Don't process very long paths to avoid performance issues
  if (constructPath.length > 1000) return constructPath;

  // Handle nested stack paths
  const nestedStackRegex =
    /(?<nestedStack>[a-zA-Z0-9_]+)\.NestedStack\/\1\.NestedStackResource$/;

  return constructPath
    .replace(nestedStackRegex, '$<nestedStack>')
    .replace('/amplifyAuth/', '/')
    .replace('/amplifyData/', '/');
};
