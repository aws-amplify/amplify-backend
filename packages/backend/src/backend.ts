import { Construct } from 'constructs';
import { ConstructFactory, ProviderFactory } from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
import {
  NestedStackResolver,
  SingletonConstructCache,
  StackMetadataBackendOutputStorageStrategy,
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

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    // register providers but don't actually execute anything yet
    Object.values(constructFactories).forEach((factory) => {
      if ('provides' in factory) {
        constructCache.registerProviderFactory(
          factory.provides,
          factory as ProviderFactory
        );
      }
    });

    // now invoke all the factories
    Object.values(constructFactories).forEach((constructFactory) => {
      constructFactory.getInstance(constructCache, outputStorageStrategy);
    });

    outputStorageStrategy.flush();
  }
}
