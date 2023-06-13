import { ProjectEnvironmentIdentifier } from '@aws-amplify/plugin-types';

/**
 * Generates an SSM parameter key to identify the main stack associated with the given project environment.
 *
 * This key is shared between stack creation in @aws-amplify/backend and stack discovery during client config generation.
 * It is the "breadcrumb" that enables client config generation to discover the stack outputs for a given project environment
 */
export const getProjectEnvironmentMainStackSSMParameterKey = (
  projectEnvironmentIdentifier: ProjectEnvironmentIdentifier
): string =>
  `/amplify/${projectEnvironmentIdentifier.projectName}/${projectEnvironmentIdentifier.environmentName}/mainStackName`;
