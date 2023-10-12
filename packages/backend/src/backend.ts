import { Construct } from 'constructs';
import { ConstructFactory } from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';
import {
  NestedStackResolver,
  StackResolver,
} from './engine/nested_stack_resolver.js';
import { SingletonConstructContainer } from './engine/singleton_construct_container.js';
import { ToggleableImportPathVerifier } from './engine/toggleable_import_path_verifier.js';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import { createDefaultStack } from './default_stack_factory.js';
import { getUniqueBackendIdentifier } from './backend_identifier.js';
import {
  BackendDeploymentType,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';
import { stackOutputKey } from '@aws-amplify/backend-output-schemas';

type ResourcesType<T extends Record<string, ConstructFactory<Construct>>> = {
  [K in keyof T]: ReturnType<T[K]['getInstance']>;
};

type ResourceCustomizationCallbackProps<
  T extends Record<string, ConstructFactory<Construct>>
> = {
  resources: ResourcesType<T>;
  stack: Stack;
};

/**
 * Class that collects and instantiates all the Amplify backend constructs
 */
export class Backend<T extends Record<string, ConstructFactory<Construct>>> {
  private readonly stackResolver: StackResolver;
  /**
   * These are the resolved CDK constructs that are created by the inputs to the constructor
   * Used for overriding properties of underlying CDK constructs or to reference in custom CDK code
   * Only initialized after invoking `generate` on the backend.
   */
  private readonly resources: ResourcesType<T>;

  private _isSettled: boolean;

  /**
   * Initialize an Amplify backend with the given construct factories and in the given CDK App.
   * If no CDK App is specified a new one is created
   */
  constructor(
    private constructFactories: T,
    private resourceCustomizationCallback: (
      props: ResourceCustomizationCallbackProps<T>
    ) => Promise<void> | void = () => {
      /* No-op */
    },
    private stack: Stack = createDefaultStack()
  ) {
    this.stackResolver = new NestedStackResolver(stack);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.resources = {} as any;
    this._isSettled = false;
    void this.generate();
  }

  /**
   * Utility method to allow awaiting completed generation.
   */
  public async isSettled(): Promise<void> {
    const sleep = (delayMs: number): Promise<void> =>
      new Promise((resolve) => setTimeout(resolve, delayMs));
    while (!this._isSettled) {
      await sleep(250);
    }
    return;
  }

  /**
   * Async synth the app resources.
   */
  private async generate(): Promise<void> {
    const constructContainer = new SingletonConstructContainer(
      this.stackResolver
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      this.stack
    );

    const uniqueBackendIdentifier = getUniqueBackendIdentifier(this.stack);
    outputStorageStrategy.addBackendOutputEntry(stackOutputKey, {
      version: '1',
      payload: {
        deploymentType:
          uniqueBackendIdentifier instanceof SandboxBackendIdentifier
            ? BackendDeploymentType.SANDBOX
            : BackendDeploymentType.BRANCH,
      },
    });

    const importPathVerifier = new ToggleableImportPathVerifier();

    // register providers but don't actually execute anything yet
    Object.values(this.constructFactories).forEach((factory) => {
      if (typeof factory.provides === 'string') {
        constructContainer.registerConstructFactory(factory.provides, factory);
      }
    });

    // now invoke all the factories and collect the constructs into this.resources
    for (const constructFactory of Object.values(this.constructFactories)) {
      if (constructFactory.prepareInstance) {
        await constructFactory.prepareInstance();
      }
    }

    Object.entries(this.constructFactories).forEach(
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

    await this.resourceCustomizationCallback({
      resources: this.resources,
      stack: this.stack,
    });

    this._isSettled = true;
  }

  /**
   * Returns a CDK stack within the Amplify project that can be used for creating custom resources
   */
  getOrCreateStack = (name: string): Stack => {
    return this.stackResolver.getStackFor(name);
  };
}
