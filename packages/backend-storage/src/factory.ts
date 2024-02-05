import { Construct } from 'constructs';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import * as path from 'path';
import {
  AmplifyStorage,
  AmplifyStorageProps,
  StorageResources,
} from './construct.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';

export type AmplifyStorageFactoryProps = Omit<
  AmplifyStorageProps,
  'outputStorageStrategy'
>;

/**
 * Singleton factory for a Storage bucket that can be used in `resource.ts` files
 */
class AmplifyStorageFactory
  implements ConstructFactory<ResourceProvider<StorageResources>>
{
  private generator: ConstructContainerEntryGenerator;

  /**
   * Set the properties that will be used to initialize the bucket
   */
  constructor(
    private readonly props: AmplifyStorageFactoryProps,
    private readonly importStack = new Error().stack
  ) {}

  /**
   * Get a singleton instance of the Bucket
   */
  getInstance = ({
    constructContainer,
    outputStorageStrategy,
    importPathVerifier,
  }: ConstructFactoryGetInstanceProps): AmplifyStorage => {
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'storage', 'resource'),
      'Amplify Storage must be defined in amplify/storage/resource.ts'
    );
    this.validateName(this.props.name);
    if (!this.generator) {
      this.generator = new AmplifyStorageGenerator(
        this.props,
        outputStorageStrategy
      );
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyStorage;
  };

  private validateName = (name: string): void => {
    const nameIsAlphanumeric = /^[a-zA-Z0-9]+$/.test(name);
    if (!nameIsAlphanumeric) {
      throw new AmplifyUserError('InvalidResourceNameError', {
        message: `defineStorage name can only contain alphanumeric characters, found ${name}`,
        resolution:
          'Change the name parameter of defineStorage to only use alphanumeric characters',
      });
    }
  };
}

class AmplifyStorageGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'storage';

  constructor(
    private readonly props: AmplifyStorageProps,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>
  ) {}

  generateContainerEntry = (scope: Construct) => {
    return new AmplifyStorage(scope, `${this.props.name}`, {
      ...this.props,
      outputStorageStrategy: this.outputStorageStrategy,
    });
  };
}

/**
 * Creates a factory that implements ConstructFactory<AmplifyStorage>
 */
export const defineStorage = (
  props: AmplifyStorageProps
): ConstructFactory<ResourceProvider<StorageResources>> =>
  new AmplifyStorageFactory(props, new Error().stack);
