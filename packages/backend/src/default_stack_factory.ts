import { App, Stack } from 'aws-cdk-lib';
import { ProjectEnvironmentMainStackCreator } from './project_environment_main_stack_creator.js';
import { getBackendIdentifier, setBackendIdentifier } from './backend_identifier.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

/**
 * Creates a default CDK scope for the Amplify backend to use if no scope is provided to the constructor
 */
export const createDefaultStack = (
  app = new App(),
  backendIdentifier?: BackendIdentifier,
): Stack => {
  if (!backendIdentifier) {
    backendIdentifier = getBackendIdentifier(app);
  }
  const mainStackCreator = new ProjectEnvironmentMainStackCreator(
    app,
    backendIdentifier,
  );
  process.once('message', (message) => {
    if (message === 'amplifySynth') {
      app.synth({ errorOnDuplicateSynth: false });
    }
  });
  const stack = mainStackCreator.getOrCreateMainStack();
  // this is hack
  setBackendIdentifier(stack, backendIdentifier);
  return stack;
};
