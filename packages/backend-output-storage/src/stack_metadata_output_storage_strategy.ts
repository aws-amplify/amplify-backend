import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  DeepPartial,
} from '@aws-amplify/plugin-types';
import { CfnOutput, Lazy, Stack } from 'aws-cdk-lib';

// Aliased strings for readability
type MetadataKey = string;
type OutputKey = string;

/**
 * Implementation of BackendOutputStorageStrategy that stores config data in stack metadata and outputs
 */
export class StackMetadataBackendOutputStorageStrategy
  implements BackendOutputStorageStrategy<BackendOutputEntry>
{
  private lazyListValueMap: Map<MetadataKey, Map<OutputKey, string[]>> =
    new Map();

  /**
   * Initialize the instance with a stack.
   *
   * If the stack is an AmplifyStack, set a parameter in SSM so the stack can be identified later by the project environment
   */
  constructor(private readonly stack: Stack) {}

  /**
   * Store construct output as stack output and add metadata to the metadata object.
   */
  addBackendOutputEntry = (
    keyName: string,
    backendOutputEntry: BackendOutputEntry
  ): void => {
    // add all the data values as stack outputs
    Object.entries(backendOutputEntry.payload).forEach(([key, value]) => {
      new CfnOutput(this.stack, key, { value });
    });

    const metadata = this.stack.templateOptions.metadata || {};
    const existingMetadataEntry = metadata[keyName];

    this.addOrUpdateMetadata(
      existingMetadataEntry,
      keyName,
      backendOutputEntry
    );
  };

  /**
   * Lazily construct and append to output list as stack output and add metadata to the metadata object.
   */
  appendToBackendOutputList = (
    keyName: string,
    backendOutputEntry: DeepPartial<BackendOutputEntry>
  ): void => {
    const version = backendOutputEntry.version;
    let listsMap = this.lazyListValueMap.get(keyName);

    const metadata = this.stack.templateOptions.metadata || {};
    const existingMetadataEntry = metadata[keyName];

    if (existingMetadataEntry) {
      if (existingMetadataEntry.version !== version) {
        throw new Error(
          `Metadata entry for ${keyName} at version ${existingMetadataEntry.version} already exists. Cannot add another entry for the same key at version ${version}.`
        );
      }
    }

    this.addOrUpdateMetadata(
      existingMetadataEntry,
      keyName,
      backendOutputEntry as BackendOutputEntry
    );

    Object.entries(backendOutputEntry.payload ?? []).forEach(
      ([listName, value]) => {
        if (!value) {
          return;
        }
        if (!listsMap) {
          listsMap = new Map();
          this.lazyListValueMap.set(keyName, listsMap);
        }
        let outputList = listsMap.get(listName);

        if (outputList) {
          outputList.push(value);
        } else {
          outputList = [value];
          listsMap.set(listName, outputList);

          new CfnOutput(this.stack, listName, {
            value: Lazy.string({ produce: () => JSON.stringify(outputList) }),
          });
        }
      }
    );
  };

  /**
   * Add or update metadata entry.
   * @param existingMetadataEntry - The existing metadata entry.
   * @param keyName - The key name.
   * @param backendOutputEntry - The backend output entry.
   */
  private addOrUpdateMetadata(
    existingMetadataEntry:
      | { version: string; stackOutputs: string[] }
      | undefined,
    keyName: string,
    backendOutputEntry: BackendOutputEntry
  ) {
    /*
     * If there's only one bucket and not the bucket is not set as default, then it only has 'buckets' in the stackOutputs.
     * So we need to manually add the bucketName and storageRegion to the stackOutputs.
     * As long as there's a bucket, the bucketName, storageRegion, and buckets will always be present in the stackOutputs.
     */
    const stackOutputs = Object.keys(backendOutputEntry.payload).includes(
      'buckets'
    )
      ? ['buckets', 'bucketName', 'storageRegion']
      : Object.keys(backendOutputEntry.payload);

    if (existingMetadataEntry) {
      this.stack.addMetadata(keyName, {
        version: backendOutputEntry.version,
        stackOutputs: [
          ...new Set([...stackOutputs, ...existingMetadataEntry.stackOutputs]),
        ],
      });
    } else {
      this.stack.addMetadata(keyName, {
        version: backendOutputEntry.version,
        stackOutputs,
      });
    }
  }
}
