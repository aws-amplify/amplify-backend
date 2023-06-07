import { Construct } from 'constructs';
import { ConstructFactory } from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
import {
  NestedStackResolver,
  SingletonConstructCache,
  StackMetadataOutputStorageStrategy,
} from '@aws-amplify/backend-engine';
import { createDefaultStack } from './default_stack_factory.js';

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
    stack: Stack = createDefaultStack()
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
