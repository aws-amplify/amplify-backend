import {
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import * as path from 'path';
import { AmplifyStorage, StorageResources } from './construct.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { AmplifyStorageFactoryProps } from './types.js';
import { StorageContainerEntryGenerator } from './storage_container_entry_generator.js';

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
  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps
  ): AmplifyStorage => {
    const { constructContainer, importPathVerifier } = getInstanceProps;
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'storage', 'resource'),
      'Amplify Storage must be defined in amplify/storage/resource.ts'
    );
    this.validateName(this.props.name);
    if (!this.generator) {
      this.generator = new StorageContainerEntryGenerator(
        this.props,
        getInstanceProps
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

/**
 * Creates a factory that implements ConstructFactory<AmplifyStorage>
 */
export const defineStorage = (
  props: AmplifyStorageFactoryProps
): ConstructFactory<ResourceProvider<StorageResources>> =>
  new AmplifyStorageFactory(props, new Error().stack);
