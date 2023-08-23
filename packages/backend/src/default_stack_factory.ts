import { App, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ProjectEnvironmentMainStackCreator } from './project_environment_main_stack_creator.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

const backendIdCDKContextKey = 'backend-id';
const branchNameCDKContextKey = 'branch-name';

/**
 * Creates a default CDK scope for the Amplify backend to use if no scope is provided to the constructor
 */
export const createDefaultStack = (app = new App()): Stack => {
  const mainStackCreator = new ProjectEnvironmentMainStackCreator(
    app,
    getUniqueBackendIdentifier(app)
  );
  return mainStackCreator.getOrCreateMainStack();
};

/**
 * Populates an instance of DeploymentContext based on CDK context values.
 */
export const getUniqueBackendIdentifier = (
  scope: Construct
): UniqueBackendIdentifier => {
  const backendId = scope.node.getContext(backendIdCDKContextKey);
  const branchName = scope.node.getContext(branchNameCDKContextKey);
  if (typeof backendId !== 'string') {
    throw new Error(
      `${backendIdCDKContextKey} CDK context value is not a string`
    );
  }
  if (typeof branchName !== 'string') {
    throw new Error(
      `${branchNameCDKContextKey} CDK context value is not a string`
    );
  }
  return {
    backendId,
    branchName,
  };
};
