import { App, Stack } from 'aws-cdk-lib';
import { ProjectEnvironmentMainStackCreator } from './project_environment_main_stack_creator.js';
import { getUniqueBackendIdentifier } from './backend_identifier.js';

/**
 * Create default app which overrides auto synth behavior to allow for async pre-synth lifecycles.
 * ttps://github.com/aws/aws-cdk/blob/9cb9fb879a95c77b4f0048ac6a1d714bb9889efb/packages/aws-cdk-lib/core/lib/app.ts#L191-L196
 * @returns the default app object.
 */
const createDefaultApp = () =>
  new App({
    // autoSynth: false,
  });

/**
 * Creates a default CDK scope for the Amplify backend to use if no scope is provided to the constructor
 */
export const createDefaultStack = (app = createDefaultApp()): Stack => {
  const mainStackCreator = new ProjectEnvironmentMainStackCreator(
    app,
    getUniqueBackendIdentifier(app)
  );
  return mainStackCreator.getOrCreateMainStack();
};
