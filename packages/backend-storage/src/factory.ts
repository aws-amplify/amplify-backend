import {
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import * as path from 'path';
import { AmplifyStorage, StorageResources } from './construct.js';
import { AmplifyStorageFactoryProps } from './types.js';
import { StorageContainerEntryGenerator } from './storage_container_entry_generator.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { Aspects, IAspect } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

/**
 * Singleton factory for a Storage bucket that can be used in `resource.ts` files
 */
export class AmplifyStorageFactory
  implements ConstructFactory<ResourceProvider<StorageResources>>
{
  static hasDefault = false;
  static factoryCounter = 0;
  static validated = false;
  private generator: ConstructContainerEntryGenerator;

  /**
   * Set the properties that will be used to initialize the bucket
   */
  constructor(
    private readonly props: AmplifyStorageFactoryProps,
    private readonly importStack = new Error().stack
  ) {
    AmplifyStorageFactory.factoryCounter++;
    if (this.props.isDefault && !AmplifyStorageFactory.hasDefault) {
      AmplifyStorageFactory.hasDefault = true;
    } else if (this.props.isDefault && AmplifyStorageFactory.hasDefault) {
      throw new AmplifyUserError('MultipleDefaultBucketError', {
        message: 'More than one default buckets set in the Amplify project.',
        resolution:
          'Remove `isDefault: true` from all `defineStorage` calls except for one in your Amplify project.',
      });
    }
  }

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
    Aspects.of(amplifyStorage).add(new StorageValidator());
    return amplifyStorage;
  };
}

/**
 * StorageValidator class implements the IAspect interface.
 */
export class StorageValidator implements IAspect {
  /**
   * Visit method to perform validation on the given node.
   * @param node The IConstruct node to visit.
   */
  public visit(node: IConstruct): void {
    if (!(node instanceof AmplifyStorage) || AmplifyStorageFactory.validated) {
      return;
    }
    if (
      !AmplifyStorageFactory.hasDefault &&
      AmplifyStorageFactory.factoryCounter > 1
    ) {
      throw new AmplifyUserError('NoDefaultBucketError', {
        message: 'No default bucket set in the Amplify project.',
        resolution:
          'Add `isDefault: true` to one of the `defineStorage` calls in your Amplify project.',
      });
    } else {
      AmplifyStorageFactory.validated = true;
    }
  }
}

/**
 * Include storage in your Amplify backend.
 * @see https://docs.amplify.aws/gen2/build-a-backend/storage/
 */
export const defineStorage = (
  props: AmplifyStorageFactoryProps
): ConstructFactory<ResourceProvider<StorageResources>> =>
  new AmplifyStorageFactory(props, new Error().stack);
