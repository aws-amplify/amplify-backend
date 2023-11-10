import { Construct } from 'constructs';
import { ConstructFactory } from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
import {
  NestedStackResolver,
  StackResolver,
} from './engine/nested_stack_resolver.js';
import { SingletonConstructContainer } from './engine/singleton_construct_container.js';
import { ToggleableImportPathVerifier } from './engine/toggleable_import_path_verifier.js';
import {
  AttributionMetadataStorage,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend-output-storage';
import { createDefaultStack } from './default_stack_factory.js';
import { getBackendIdentifier } from './backend_identifier.js';
import { platformOutputKey } from '@aws-amplify/backend-output-schemas';
import { fileURLToPath } from 'url';
import { Backend } from './backend.js';
import { AmplifyBranchLinkerConstruct } from './engine/branch-linker/branch_linker_construct.js';

// Be very careful editing this value. It is the value used in the BI metrics to attribute stacks as Amplify root stacks
const rootStackTypeIdentifier = 'root';

/**
 * Factory that collects and instantiates all the Amplify backend constructs
 */
export class BackendFactory<
  T extends Record<string, ConstructFactory<Construct>>
> implements Backend<T>
{
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
    new AttributionMetadataStorage().storeAttributionMetadata(
      stack,
      rootStackTypeIdentifier,
      fileURLToPath(new URL('../package.json', import.meta.url))
    );
    this.stackResolver = new NestedStackResolver(
      stack,
      new AttributionMetadataStorage()
    );

    const constructContainer = new SingletonConstructContainer(
      this.stackResolver
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    const backendId = getBackendIdentifier(stack);
    outputStorageStrategy.addBackendOutputEntry(platformOutputKey, {
      version: '1',
      payload: {
        deploymentType: backendId.type,
        region: stack.region,
      },
    });

    const shouldEnableBranchLinker = backendId.type === 'branch';

    if (shouldEnableBranchLinker) {
      new AmplifyBranchLinkerConstruct(stack, backendId);
    }

    const importPathVerifier = new ToggleableImportPathVerifier();

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
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as any;
      }
    );
  }

  /**
   * Returns a CDK stack within the Amplify project that can be used for creating custom resources.
   * @returns existing stack if provided name has been used or create new one with the provided name
   */
  getStack = (name: string): Stack => {
    return this.stackResolver.getCustomStack(name);
  };
}

/**
 * Creates a new Amplify backend instance and returns it
 * @param constructFactories - list of backend factories such as those created by `defineAuth` or `defineData`
 */
export const defineBackend = <
  T extends Record<string, ConstructFactory<Construct>>
>(
  constructFactories: T
): Backend<T> => new BackendFactory(constructFactories);
