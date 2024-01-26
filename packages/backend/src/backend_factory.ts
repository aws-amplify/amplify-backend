import {
  AppendableBackendOutputEntry,
  ConstructFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
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
import { Backend, CustomOutputOptions, DefineBackendProps } from './backend.js';
import { AmplifyBranchLinkerConstruct } from './engine/branch-linker/branch_linker_construct.js';
import { ClientConfig } from '@aws-amplify/client-config';

// Be very careful editing this value. It is the value used in the BI metrics to attribute stacks as Amplify root stacks
const rootStackTypeIdentifier = 'root';

/**
 * Factory that collects and instantiates all the Amplify backend constructs
 */
export class BackendFactory<
  T extends Record<string, ConstructFactory<ResourceProvider>>
> {
  /**
   * These are the resolved CDK constructs that are created by the inputs to the constructor
   * Used for overriding properties of underlying CDK constructs or to reference in custom CDK code
   */
  readonly resources: {
    [K in keyof T]: ReturnType<T[K]['getInstance']>;
  };

  private readonly stackResolver: StackResolver;
  private readonly outputStorageStrategy: StackMetadataBackendOutputStorageStrategy;
  private customOutputsEntry: AppendableBackendOutputEntry | undefined;
  private customOutputsAlternativeEntryCount = 0;
  private customOutputsEntryAlternative:
    | AppendableBackendOutputEntry
    | undefined;

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

    this.outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    const backendId = getBackendIdentifier(stack);
    this.outputStorageStrategy.addBackendOutputEntry(platformOutputKey, {
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
            outputStorageStrategy: this.outputStorageStrategy,
            importPathVerifier,
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as any;
      }
    );
  }

  /**
   * Returns a CDK stack within the Amplify project that can be used for creating custom resources.
   * If a stack has already been created with "name" then an error is thrown.
   */
  createStack = (name: string): Stack => {
    return this.stackResolver.createCustomStack(name);
  };

  setCustomOutput = (
    key: string,
    value: string,
    options?: CustomOutputOptions
  ): void => {
    /*
    Looks like this must be in certain format.
    From attempt to use non-alpha numeric characters with this.outputStorageStrategy.addBackendOutputEntry() in early prototype.

    The CloudFormation deployment has failed. Find more information in the CloudFormation AWS Console for this stack.
    Caused By: ❌ Deployment failed: Error [ValidationError]: Template format error: Outputs name 'amplify-custom-myApiUrl-value' is non alphanumeric.
     */

    if (!this.customOutputsEntry) {
      this.customOutputsEntry =
        this.outputStorageStrategy.addAppendableBackendOutputEntry(
          'AWS::Amplify::Custom'
        );
    }

    const outputData = JSON.stringify({ value: value, options });
    console.log(outputData);
    // TODO how do we do custom namespacing ??
    this.customOutputsEntry.appendOutput(`amplifycustom${key}`, outputData);
  };

  addToClientConfig = (clientConfigPart: Partial<ClientConfig>) => {
    // Lets see if this can work.
    // This implementation doesn't do much, it just tries to see if we can serialize cdk tokens.

    if (!this.customOutputsEntryAlternative) {
      this.customOutputsEntryAlternative =
        this.outputStorageStrategy.addAppendableBackendOutputEntry(
          'AWS::Amplify::Custom::Alternative'
        );
    }

    const outputData = JSON.stringify(clientConfigPart);
    this.customOutputsEntryAlternative.appendOutput(
      `alternativeCustomApproach${this.customOutputsAlternativeEntryCount}`,
      outputData
    );
    this.customOutputsAlternativeEntryCount++;
  };
}

/**
 * Creates a new Amplify backend instance and returns it
 * @param constructFactories - list of backend factories such as those created by `defineAuth` or `defineData`
 */
export const defineBackend = <T extends DefineBackendProps>(
  constructFactories: T
): Backend<T> => {
  const backend = new BackendFactory(constructFactories);
  return {
    ...backend.resources,
    createStack: backend.createStack,
    setCustomOutput: backend.setCustomOutput,
    addToClientConfig: (clientConfigPart: Partial<ClientConfig>) => {
      // TODO This is alternative proposal
      // NO-OP for now but the idea is that we allow to put a partial of client config schema
      // into some output
      // and just merge it with client config at read.

      // This likely could use client config unification.
      // I.e. backend def -> unified client config partial to outputs -> deployment ->
      // -> outputs -> read unified client config -> map to js/ts/dart/whatever.

      // Should we start crafting unified schema nad return it from generateClientConfig API ?
      // and map to old/v6 formats in generateClientConfigToFile ?

      backend.addToClientConfig(clientConfigPart);
    },
  };
};
