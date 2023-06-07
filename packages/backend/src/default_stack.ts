import { App, Stack } from 'aws-cdk-lib';
import {
  AmplifyStack,
  ProjectEnvironmentTuple,
} from '@aws-amplify/backend-engine';
import { Construct } from 'constructs';

const projectNameCDKContextKey = 'project-name';
const environmentNameCDKContextKey = 'environment-name';

/**
 * Creates a default CDK scope for the Amplify backend to use if no scope is provided to the constructor
 */
export const createDefaultRootStack = (app = new App()): Stack => {
  return new AmplifyStack(app, 'amplifyMainStack', {
    projectEnvironmentTuple: getProjectEnvironmentTuple(app),
  });
};

const getProjectEnvironmentTuple = (
  scope: Construct
): ProjectEnvironmentTuple => {
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
