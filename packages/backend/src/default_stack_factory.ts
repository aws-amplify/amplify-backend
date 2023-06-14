import { App, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ProjectEnvironmentIdentifier } from '@aws-amplify/plugin-types';
import { ProjectEnvironmentMainStackCreator } from './project_environment_main_stack_creator.js';

const projectNameCDKContextKey = 'project-name';
const environmentNameCDKContextKey = 'environment-name';

/**
 * Creates a default CDK scope for the Amplify backend to use if no scope is provided to the constructor
 */
export const createDefaultStack = (app = new App()): Stack => {
  const mainStackCreator = new ProjectEnvironmentMainStackCreator(
    app,
    getProjectEnvironmentIdentifier(app)
  );
  return mainStackCreator.getOrCreateMainStack();
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
