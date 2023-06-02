import { Construct } from 'constructs';
import {
  AmplifyConstruct,
  ConstructFactory,
  FrontendConfigValuesProvider,
} from '@aws-amplify/plugin-types';
import { App, Stack } from 'aws-cdk-lib';
import {
  NestedStackResolver,
  SingletonConstructCache,
  StackMetadataRegistry,
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
    constructFactories: Record<string, ConstructFactory<AmplifyConstruct>>,
    scope: Construct = new App()
  ) {
    const stack = new Stack(scope);
    const constructCache = new SingletonConstructCache(
      new NestedStackResolver(stack)
    );

    const frontendConfigRegistry = new StackMetadataRegistry(stack);

    Object.values(constructFactories).forEach((constructFactory) => {
      const construct = constructFactory.getInstance(constructCache);
      if (constructIsFrontendConfigValuesProvider(construct)) {
        construct.provideFrontendConfigValues(frontendConfigRegistry);
      }
    });
  }
}

const constructIsFrontendConfigValuesProvider = (
  construct: Partial<FrontendConfigValuesProvider>
): construct is FrontendConfigValuesProvider => {
  return typeof construct.provideFrontendConfigValues === 'function';
};
