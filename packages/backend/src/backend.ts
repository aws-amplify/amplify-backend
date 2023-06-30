import { Construct } from 'constructs';
import { ConstructFactory } from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
import {
  EnvironmentBasedImportPathVerifier,
  NestedStackResolver,
  SingletonConstructContainer,
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
    const constructContainer = new SingletonConstructContainer(
      new NestedStackResolver(stack)
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    const importPathVerifier = new EnvironmentBasedImportPathVerifier();

    // register providers but don't actually execute anything yet
    Object.values(constructFactories).forEach((factory) => {
      if (typeof factory.provides === 'string') {
        constructContainer.registerConstructFactory(factory.provides, factory);
      }
    });

    // now invoke all the factories
    Object.values(constructFactories).forEach((constructFactory) => {
      constructFactory.getInstance(
        constructContainer,
        outputStorageStrategy,
        importPathVerifier
      );
    });

    outputStorageStrategy.flush();
  }
}
