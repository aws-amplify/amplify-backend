/**
 * Creates a friendly name for a resource, using CDK metadata when available.
 * @param logicalId The logical ID of the resource
 * @param metadata Optional CDK metadata that may contain construct path
 * @param metadata.constructPath Optional construct path from CDK metadata
 * @returns A user-friendly name for the resource
 */
export function createFriendlyName(
  logicalId: string,
  metadata?: { constructPath?: string }
): string {
  // If we have CDK metadata with a construct path, use it
  if (metadata?.constructPath) {
    return normalizeCDKConstructPath(metadata.constructPath);
  }
  
  // For CloudFormation stacks, try to extract a friendly name
  if (logicalId.includes('NestedStack') || logicalId.endsWith('StackResource')) {
    const nestedStackName = getFriendlyNameFromNestedStackName(logicalId);
    if (nestedStackName) {
      return nestedStackName;
    }
  }
  
  // Fall back to the basic transformation
  let name = logicalId.replace(/^amplify/, '').replace(/^Amplify/, '');
  name = name.replace(/([A-Z])/g, ' $1').trim();
  name = name.replace(/[0-9]+[A-Z]*[0-9]*/, '');
  
  return name || logicalId;
}

/**
 * Normalizes a CDK construct path to create a more readable friendly name
 */
function normalizeCDKConstructPath(constructPath: string): string {
  // Don't process very long paths to avoid performance issues
  if (constructPath.length > 1000) return constructPath;
  
  // Handle nested stack paths
  const nestedStackRegex = /(?<nestedStack>[a-zA-Z0-9_]+)\.NestedStack\/\1\.NestedStackResource$/;
  
  return constructPath
    .replace(nestedStackRegex, '$<nestedStack>')
    .replace('/amplifyAuth/', '/')
    .replace('/amplifyData/', '/');
}

/**
 * Extracts a friendly name from a nested stack logical ID
 */
function getFriendlyNameFromNestedStackName(stackName: string): string | undefined {
  const parts = stackName.split('-');
  
  if (parts && parts.length === 7 && parts[3] === 'sandbox') {
    return parts[5].slice(0, -10) + ' stack';
  } else if (parts && parts.length === 5 && parts[3] === 'sandbox') {
    return 'root stack';
  }
  
  return undefined;
}

/**
 * Clean ANSI escape codes from text
 * @param text The text to clean
 * @returns The cleaned text
 */
export function cleanAnsiCodes(text: string): string {
  // This regex handles various ANSI escape sequences including colors, bold, dim, etc.
  return text.replace(/\u001b\[\d+(;\d+)*m|\[2m|\[22m|\[1m|\[36m|\[39m/g, '');
}

/**
 * Check if a message is a deployment progress message
 * @param message The message to check
 * @returns True if the message is a deployment progress message
 */
export function isDeploymentProgressMessage(message: string): boolean {
  const cleanedMessage = cleanAnsiCodes(message);
  return (
    cleanedMessage.includes('_IN_PROGRESS') ||
    cleanedMessage.includes('CREATE_') ||
    cleanedMessage.includes('DELETE_') ||
    cleanedMessage.includes('UPDATE_') ||
    cleanedMessage.includes('Deployment in progress') ||
    cleanedMessage.includes('COMPLETE') ||
    cleanedMessage.includes('FAILED') ||
    // Match CloudFormation resource status patterns
    /\d+:\d+:\d+\s+[AP]M\s+\|\s+[A-Z_]+\s+\|\s+.+\s+\|\s+.+/.test(cleanedMessage)
  );
}