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
    if (!this.generator) {
      this.generator = new StorageContainerEntryGenerator(
        {
          ...this.props,
          name: this.sanitizeName(this.props.name),
        },
        getInstanceProps
      );
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyStorage;
  };

  private sanitizeName = (name: string): string => {
    const sanitizedName = this.toKebabCase(name);

    if (!/^[a-z0-9-]+$/.test(sanitizedName)) {
      throw new AmplifyUserError('InvalidResourceNameError', {
        message: `defineStorage name contains invalid characters, found ${name}`,
        resolution:
          'Update name to use only alphanumeric characters and dashes',
      });
    }

    return sanitizedName;
  };

  private toKebabCase = (str: string): string =>
    str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
}

/**
 * Include storage in your Amplify backend.
 * @see https://docs.amplify.aws/gen2/build-a-backend/storage/
 */
export const defineStorage = (
  props: AmplifyStorageFactoryProps
): ConstructFactory<ResourceProvider<StorageResources>> =>
  new AmplifyStorageFactory(props, new Error().stack);
