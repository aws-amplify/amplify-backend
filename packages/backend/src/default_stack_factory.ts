import { App, Stack } from 'aws-cdk-lib';
import { AmplifyStack } from '@aws-amplify/backend-engine';
import { Construct } from 'constructs';
import { ProjectEnvironmentIdentifier } from '@aws-amplify/primitives';

const projectNameCDKContextKey = 'project-name';
const environmentNameCDKContextKey = 'environment-name';

/**
 * Creates a default CDK scope for the Amplify backend to use if no scope is provided to the constructor
 */
export const createDefaultStack = (app = new App()): Stack => {
  return new AmplifyStack(app, 'amplifyMainStack', {
    projectEnvironmentIdentifier: getProjectEnvironmentIdentifier(app),
  });
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
  return new ProjectEnvironmentIdentifier(projectName, environmentName);
};
