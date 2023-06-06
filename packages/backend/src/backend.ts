import { Construct } from 'constructs';
import { ConstructFactory } from '@aws-amplify/plugin-types';
import { App, Stack } from 'aws-cdk-lib';
import {
  NestedStackResolver,
  SingletonConstructCache,
  StackMetadataOutputStorageStrategy,
} from '@aws-amplify/backend-engine';

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

    const outputStorageStrategy = new StackMetadataOutputStorageStrategy(stack);

    Object.values(constructFactories).forEach((constructFactory) => {
      constructFactory.getInstance(constructCache, outputStorageStrategy);
    });
  }
}

/**
 * Creates a default CDK scope for the Amplify backend to use if no scope is provided to the constructor
 */
const createDefaultRootStack = (): Stack => {
  const app = new App();
  return new Stack(app, 'AmplifyRootStack');
};
