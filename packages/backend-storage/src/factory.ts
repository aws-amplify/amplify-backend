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
import { Aspects, CfnOutput, IAspect, Stack } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

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
    Aspects.of(amplifyStorage).add(
      new StorageValidator(Stack.of(amplifyStorage))
    );
    return amplifyStorage;
  };
}

/**
 * StorageValidator class implements the IAspect interface.
 */
export class StorageValidator implements IAspect {
  /**
   * Constructs a new instance of the StorageValidator class.
   * @param stack The stack to validate.
   */
  constructor(private readonly stack: Stack) {}
  /**
   * Visit method to perform validation on the given node.
   * @param node The IConstruct node to visit.
   */
  public visit(node: IConstruct): void {
    if (!(node instanceof AmplifyStorage)) {
      return;
    }

    let storageCount = 0;
    let hasDefault = false;
    this.stack.node.children.forEach((child) => {
      if (!(child instanceof AmplifyStorage)) {
        return;
      }
      storageCount++;
      if (child.isDefault && !hasDefault) {
        hasDefault = true;
      } else if (child.isDefault && hasDefault) {
        throw new AmplifyUserError('MultipleDefaultBucketError', {
          message: 'More than one default buckets set in the Amplify project.',
          resolution:
            'Remove `isDefault: true` from all `defineStorage` calls except for one in your Amplify project.',
        });
      }
    });
    /*
     * If there is no default bucket set and there is only one bucket,
     * meaning it's never gone through StackMetadataBackendOutputStorageStrategy method addBackendOutputEntry,
     * so we need to add the bucket name and region to the stack outputs.
     */
    if (!hasDefault && storageCount === 1) {
      const parentStack = this.stack.nestedStackParent || this.stack;
      new CfnOutput(parentStack, 'bucketName', {
        value: node.resources.bucket.bucketName,
      });
      new CfnOutput(parentStack, 'storageRegion', {
        value: node.resources.bucket.stack.region,
      });
    } else if (!hasDefault && storageCount > 1) {
      throw new AmplifyUserError('NoDefaultBucketError', {
        message: 'No default bucket set in the Amplify project.',
        resolution:
          'Add `isDefault: true` to one of the `defineStorage` calls in your Amplify project.',
      });
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
