import {
  BackendOutputStorageStrategy,
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
import { Aspects, IAspect, Stack } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  StorageOutput,
  storageOutputKey,
} from '@aws-amplify/backend-output-schemas';

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

    const firstStorage = Stack.of(amplifyStorage).node.children.filter(
      (el) => el instanceof AmplifyStorage
    )[0] as AmplifyStorage;

    /*
     * only call Aspects once,
     * otherwise there will be the an error -
     * "there is already a construct with name 'storageRegion'"
     */
    if (firstStorage.name === this.props.name) {
      Aspects.of(Stack.of(amplifyStorage)).add(
        new StorageValidator(getInstanceProps.outputStorageStrategy)
      );
    }

    return amplifyStorage;
  };
}

/**
 * StorageValidator class implements the IAspect interface.
 */
export class StorageValidator implements IAspect {
  node: IConstruct;
  outputStorageStrategy;
  /**
   * Constructs a new instance of the StorageValidator class.
   */
  constructor(
    outputStorageStrategy: BackendOutputStorageStrategy<StorageOutput>
  ) {
    this.outputStorageStrategy = outputStorageStrategy;
  }
  /**
   * Visit method to perform validation on the given node.
   * @param node The IConstruct node to visit.
   */
  public visit(node: IConstruct): void {
    if (!(node instanceof AmplifyStorage)) {
      return;
    }
    const storageInstances = Stack.of(node).node.children.filter(
      (el) => el instanceof AmplifyStorage
    );
    const storageCount = storageInstances.length;
    const firstStorage = Stack.of(node).node.children.filter(
      (el) => el instanceof AmplifyStorage
    )[0];
    if (node !== firstStorage) {
      return;
    }
    this.node = node;
    let hasDefault = false;

    Stack.of(node).node.children.forEach((child) => {
      if (!(child instanceof AmplifyStorage)) {
        return;
      }
      if (child.isDefault && !hasDefault) {
        hasDefault = true;
      } else if (child.isDefault && hasDefault) {
        throw new AmplifyUserError('MultipleDefaultStoragesError', {
          message: `More than one default storages set in the Amplify project.`,
          resolution:
            'Remove `isDefault: true` from all `defineStorage` calls except for one in your Amplify project.',
        });
      }
    });
    /*
     * If there is no default bucket set and there is only one bucket,
     * we need to set the bucket as default.
     */
    if (!hasDefault && storageCount === 1) {
      this.storeOutput(
        this.outputStorageStrategy,
        true,
        node.name,
        node.resources.bucket.bucketName
      );
    } else if (!hasDefault && storageCount > 1) {
      throw new AmplifyUserError('NoDefaultBucketError', {
        message: 'No default bucket set in the Amplify project.',
        resolution:
          'Add `isDefault: true` to one of the `defineStorage` calls in your Amplify project.',
      });
    } else {
      Stack.of(node).node.children.forEach((child) => {
        if (!(child instanceof AmplifyStorage)) {
          return;
        }
        this.storeOutput(
          this.outputStorageStrategy,
          child.isDefault,
          child.name,
          child.resources.bucket.bucketName
        );
      });
    }
  }

  private storeOutput = (
    outputStorageStrategy: BackendOutputStorageStrategy<StorageOutput> = new StackMetadataBackendOutputStorageStrategy(
      Stack.of(this.node).nestedStackParent || Stack.of(this.node)
    ),
    isDefault: boolean = false,
    name: string = '',
    bucketName: string = ''
  ): void => {
    if (isDefault) {
      outputStorageStrategy.addBackendOutputEntry(storageOutputKey, {
        version: '1',
        payload: {
          storageRegion: Stack.of(this.node).region,
          bucketName,
        },
      });
    }

    // both default and non-default buckets should have the name, bucket name, and storage region stored in `buckets` field
    outputStorageStrategy.appendToBackendOutputList(storageOutputKey, {
      version: '1',
      payload: {
        buckets: JSON.stringify({
          name,
          bucketName,
          storageRegion: Stack.of(this.node).region,
        }),
      },
    });
  };
}

/**
 * Include storage in your Amplify backend.
 * @see https://docs.amplify.aws/gen2/build-a-backend/storage/
 */
export const defineStorage = (
  props: AmplifyStorageFactoryProps
): ConstructFactory<ResourceProvider<StorageResources>> =>
  new AmplifyStorageFactory(props, new Error().stack);
