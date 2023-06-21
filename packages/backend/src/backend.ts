import { Construct } from 'constructs';
import { ConstructFactory } from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
import {
  NestedStackResolver,
  SetOnceAuthResourceReferencesContainer,
  SingletonConstructCache,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend-engine';
import { createDefaultStack } from './default_stack_factory.js';
import { RecordEntryPartialKeyOrdering } from './record_entry_partial_key_ordering.js';

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

    const authResourceReferencesContainer =
      new SetOnceAuthResourceReferencesContainer();

    const constructFactoryOrdering = new RecordEntryPartialKeyOrdering(
      constructFactories,
      ['auth'],
      ['data']
    );

    constructFactoryOrdering
      .getOrderedEntries()
      .forEach(([, constructFactory]) => {
        constructFactory.getInstance(
          constructCache,
          outputStorageStrategy,
          authResourceReferencesContainer
        );
      });

    outputStorageStrategy.flush();
  }
}
