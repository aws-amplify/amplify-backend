import { Construct } from 'constructs';
import { ProjectEnvironmentIdentifier } from '@aws-amplify/plugin-types';

const projectNameCDKContextKey = 'project-name';
const environmentNameCDKContextKey = 'environment-name';

/**
 * Gets the project environment identifier from the CDK context
 */
export const getProjectEnvironmentIdentifier = (
  scope: Construct
): ProjectEnvironmentIdentifier => {
  const projectName = scope.node.getContext(projectNameCDKContextKey);
  const environmentName = scope.node.getContext(environmentNameCDKContextKey);
  if (typeof projectName !== 'string') {
    throw new Error(
      `${projectNameCDKContextKey} CDK context value is not a string`
    );
  }
  if (typeof environmentName !== 'string') {
    throw new Error(
      `${environmentNameCDKContextKey} CDK context value is not a string`
    );
  }
  return {
    projectName,
    environmentName,
  };
};
