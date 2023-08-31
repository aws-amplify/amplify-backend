import { Construct } from 'constructs';
import { ConstructFactory } from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
import {
  NestedStackResolver,
  StackResolver,
} from './engine/nested_stack_resolver.js';
import { DeepBackendSecretResolver } from './engine/backend-secret/backend_secret_resolver.js';
import { SingletonConstructContainer } from './engine/singleton_construct_container.js';
import { ToggleableImportPathVerifier } from './engine/toggleable_import_path_verifier.js';
import { StackMetadataBackendOutputStorageStrategy } from './engine/stack_metadata_output_storage_strategy.js';
import {
  createDefaultStack,
  getUniqueBackendIdentifier,
} from './default_stack_factory.js';

/**
 * Class that collects and instantiates all the Amplify backend constructs
 */
export class Backend<T extends Record<string, ConstructFactory<Construct>>> {
  private readonly stackResolver: StackResolver;
  /**
   * These are the resolved CDK constructs that are created by the inputs to the constructor
   * Used for overriding properties of underlying CDK constructs or to reference in custom CDK code
   */
  readonly resources: {
    [K in keyof T]: ReturnType<T[K]['getInstance']>;
  };
  /**
   * Initialize an Amplify backend with the given construct factories and in the given CDK App.
   * If no CDK App is specified a new one is created
   */
  constructor(constructFactories: T, stack: Stack = createDefaultStack()) {
    this.stackResolver = new NestedStackResolver(stack);

    const constructContainer = new SingletonConstructContainer(
      this.stackResolver
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    const importPathVerifier = new ToggleableImportPathVerifier();

    const backendIdentifier = getUniqueBackendIdentifier(stack);

    const backendSecretResolver = new DeepBackendSecretResolver(
      stack,
      backendIdentifier.backendId,
      backendIdentifier.branchName
    );

    // register providers but don't actually execute anything yet
    Object.values(constructFactories).forEach((factory) => {
      if (typeof factory.provides === 'string') {
        constructContainer.registerConstructFactory(factory.provides, factory);
      }
    });

    // now invoke all the factories and collect the constructs into this.resources
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.resources = {} as any;
    Object.entries(constructFactories).forEach(
      ([resourceName, constructFactory]) => {
        // The type inference on this.resources is not happy about this assignment because it doesn't know the exact type of .getInstance()
        // However, the assignment is okay because we are iterating over the entries of constructFactories and assigning the resource name to the corresponding instance
        this.resources[resourceName as keyof T] = constructFactory.getInstance(
          {
            constructContainer,
            outputStorageStrategy,
            importPathVerifier,
            backendSecretResolver,
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as any;
      }
    );

    outputStorageStrategy.flush();
  }

  /**
   * Returns a CDK stack within the Amplify project that can be used for creating custom resources
   */
  getOrCreateStack = (name: string): Stack => {
    return this.stackResolver.getStackFor(name);
  };
}
