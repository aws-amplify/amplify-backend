import { Construct } from 'constructs';
import { ConstructFactory } from '@aws-amplify/plugin-types';
import { App, Stack } from 'aws-cdk-lib';
import {
  AmplifyBackendCDKPlatform,
  NestedStackResolver,
  SingletonConstructCache,
  StackMetadataOutputStorageStrategy,
} from '@aws-amplify/backend-engine';
import { AmplifyStack } from '@aws-amplify/backend-engine/lib/amplify_stack.js';

/**
 * Class that collects and instantiates all the Amplify backend constructs
 */
export class Backend {
  /**
   * Initialize an Amplify backend with the given construct factories and in the given CDK App.
   * If no CDK App is specified a new one is created
   */
  constructor(
    constructFactories: Record<string, ConstructFactory<Construct>>,
    stack: Stack = createDefaultRootStack()
  ) {
    const constructCache = new SingletonConstructCache(
      new NestedStackResolver(stack)
    );

    const backendPlatform = new AmplifyBackendCDKPlatform(
      new StackMetadataOutputStorageStrategy(stack)
    );

    Object.values(constructFactories).forEach((constructFactory) => {
      constructFactory.getInstance(constructCache, backendPlatform);
    });
  }
}

/**
 * Creates a default CDK scope for the Amplify backend to use if no scope is provided to the constructor
 */
const createDefaultRootStack = (): Stack => {
  const app = new App();
  return new AmplifyStack(app, 'AmplifyRootStack');
};
