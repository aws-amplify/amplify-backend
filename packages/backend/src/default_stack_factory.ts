import { App, Stack } from 'aws-cdk-lib';
import { ProjectEnvironmentBackendIdentificationStrategy } from '@aws-amplify/backend-engine';
import { Construct } from 'constructs';
import { ProjectEnvironmentIdentifier } from '@aws-amplify/backend-types';

const projectNameCDKContextKey = 'project-name';
const environmentNameCDKContextKey = 'environment-name';

/**
 * Creates a default CDK scope for the Amplify backend to use if no scope is provided to the constructor
 */
export const createDefaultStack = (app = new App()): Stack => {
  const backendIdentificationStrategy =
    new ProjectEnvironmentBackendIdentificationStrategy(
      getProjectEnvironmentIdentifier(app)
    );
  return backendIdentificationStrategy.createStack(app);
};

const getProjectEnvironmentIdentifier = (
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
