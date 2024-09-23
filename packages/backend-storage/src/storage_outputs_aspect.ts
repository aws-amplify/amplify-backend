import {
  StorageOutput,
  storageOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { IAspect, Stack } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { AmplifyStorage } from './construct.js';
import { StorageAccessDefinitionOutput } from './private_types.js';

/**
 * Aspect to store the storage outputs in the backend
 */
export class StorageOutputsAspect implements IAspect {
  isStorageProcessed = false;
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
   * Visit the given node.
   * If the node is an AmplifyStorage construct, we will traverse its siblings in the same stack
   * @param node The node to visit.
   */
  public visit(node: IConstruct): void {
    if (!(node instanceof AmplifyStorage) || this.isStorageProcessed) {
      return;
    }
    /**
     * only traverse the siblings once to store the outputs,
     * storing the same outputs multiple times result in error
     */
    this.isStorageProcessed = true;

    const storageInstances = Stack.of(node).node.children.filter(
      (el) => el instanceof AmplifyStorage
    );
    const storageCount = storageInstances.length;

    let defaultStorageFound = false;

    Stack.of(node).node.children.forEach((child) => {
      if (!(child instanceof AmplifyStorage)) {
        return;
      }
      if (child.isDefault && !defaultStorageFound) {
        defaultStorageFound = true;
      } else if (child.isDefault && defaultStorageFound) {
        throw new AmplifyUserError('MultipleDefaultStorageError', {
          message: `More than one default storage set in the Amplify project.`,
          resolution:
            'Remove `isDefault: true` from all `defineStorage` calls except for one in your Amplify project.',
        });
      }
    });
    /*
     * If there is no default bucket set and there is only one bucket,
     * we need to set the bucket as default.
     */
    if (!defaultStorageFound && storageCount === 1) {
      this.storeOutput(this.outputStorageStrategy, true, node);
    } else if (!defaultStorageFound && storageCount > 1) {
      throw new AmplifyUserError('NoDefaultStorageError', {
        message: 'No default storage set in the Amplify project.',
        resolution:
          'Add `isDefault: true` to one of the `defineStorage` calls in your Amplify project.',
      });
    } else {
      Stack.of(node).node.children.forEach((child) => {
        if (!(child instanceof AmplifyStorage)) {
          return;
        }
        this.storeOutput(this.outputStorageStrategy, child.isDefault, child);
      });
    }
  }

  private storeOutput = (
    outputStorageStrategy: BackendOutputStorageStrategy<StorageOutput>,
    isDefault: boolean = false,
    node: AmplifyStorage
  ): void => {
    if (isDefault) {
      outputStorageStrategy.addBackendOutputEntry(storageOutputKey, {
        version: '1',
        payload: {
          storageRegion: Stack.of(node).region,
          bucketName: node.resources.bucket.bucketName,
        },
      });
    }
    const bucketsPayload: Record<
      string,
      string | StorageAccessDefinitionOutput
    > = {
      name: node.name,
      bucketName: node.resources.bucket.bucketName,
      storageRegion: Stack.of(node).region,
    };
    if (node.accessDefinition) {
      bucketsPayload.paths = node.accessDefinition;
    }
    // both default and non-default buckets should have the name, bucket name, and storage region stored in `buckets` field
    outputStorageStrategy.appendToBackendOutputList(storageOutputKey, {
      version: '1',
      payload: {
        buckets: JSON.stringify(bucketsPayload),
      },
    });
  };
}
