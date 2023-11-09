import { App, Stack } from 'aws-cdk-lib';
import { ProjectEnvironmentMainStackCreator } from './project_environment_main_stack_creator.js';
import { getBackendIdentifier } from './backend_identifier.js';

/**
 * Creates a default CDK scope for the Amplify backend to use if no scope is provided to the constructor
 */
export const createDefaultStack = (app = new App()): Stack => {
  const mainStackCreator = new ProjectEnvironmentMainStackCreator(
    app,
    getBackendIdentifier(app)
  );
  return mainStackCreator.getOrCreateMainStack();
};
