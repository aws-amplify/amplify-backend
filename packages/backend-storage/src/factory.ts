import {
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceProvider,
  StackProvider,
} from '@aws-amplify/plugin-types';
import * as path from 'path';
import { AmplifyStorage, StorageResources } from './construct.js';
import { AmplifyStorageFactoryProps } from './types.js';
import { StorageContainerEntryGenerator } from './storage_container_entry_generator.js';
import { Aspects, Stack } from 'aws-cdk-lib';
import { StorageOutputsAspect } from './storage_outputs_aspect.js';

/**
 * Singleton factory for a Storage bucket that can be used in `resource.ts` files
 */
export class AmplifyStorageFactory
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
    const { constructContainer, importPathVerifier, resourceNameValidator } =
      getInstanceProps;
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'storage', 'resource'),
      'Amplify Storage must be defined in amplify/storage/resource.ts'
    );
    resourceNameValidator?.validate(this.props.name);

    if (!this.generator) {
      this.generator = new StorageContainerEntryGenerator(
        this.props,
        getInstanceProps
      );
    }
    const amplifyStorage = constructContainer.getOrCompute(
      this.generator
    ) as AmplifyStorage;

    /*
     * only call Aspects once,
     * otherwise there will be the an error -
     * "there is already a construct with name 'storageRegion'"
     */
    const aspects = Aspects.of(Stack.of(amplifyStorage));
    if (!aspects.all.length) {
      aspects.add(
        new StorageOutputsAspect(getInstanceProps.outputStorageStrategy)
      );
    }

    return amplifyStorage;
  };
}

/**
 * Include storage in your Amplify backend.
 * @see https://docs.amplify.aws/gen2/build-a-backend/storage/
 */
export const defineStorage = (
  props: AmplifyStorageFactoryProps
): ConstructFactory<ResourceProvider<StorageResources> & StackProvider> =>
  new AmplifyStorageFactory(props, new Error().stack);
