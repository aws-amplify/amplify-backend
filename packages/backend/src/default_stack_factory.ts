import { App, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ProjectEnvironmentMainStackCreator } from './project_environment_main_stack_creator.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

const appNameCDKContextKey = 'app-name';
const disambiguatorCDKContextKey = 'disambiguator';
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
const getUniqueBackendIdentifier = (
  scope: Construct
): UniqueBackendIdentifier => {
  const appName = scope.node.getContext(appNameCDKContextKey);
  const branchName = scope.node.getContext(branchNameCDKContextKey);
  const disambiguator = scope.node.getContext(disambiguatorCDKContextKey);
  if (typeof appName !== 'string') {
    throw new Error(
      `${appNameCDKContextKey} CDK context value is not a string`
    );
  }
  if (typeof branchName !== 'string') {
    throw new Error(
      `${branchNameCDKContextKey} CDK context value is not a string`
    );
  }
  if (typeof disambiguator !== 'string') {
    throw new Error(
      `${disambiguatorCDKContextKey} CDK context value is not a string`
    );
  }
  return {
    appName,
    disambiguator,
    branchName,
  };
};
