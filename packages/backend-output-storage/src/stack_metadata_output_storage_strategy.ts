import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
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

    const metadataValue =
      this.stack.templateOptions.metadata &&
      this.stack.templateOptions.metadata[keyName]
        ? this.stack.templateOptions.metadata[keyName]
        : { stackOutputs: [] };

    this.stack.addMetadata(keyName, {
      ...metadataValue,
      version: backendOutputEntry.version,
      stackOutputs: [
        ...metadataValue.stackOutputs,
        ...Object.keys(backendOutputEntry.payload),
      ],
    });
  };

  /**
   * Lazily construct and append to output list as stack output and add metadata to the metadata object.
   */
  appendToBackendOutputList = (
    keyName: string,
    backendOutputEntry: BackendOutputEntry
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
    } else {
      this.stack.addMetadata(keyName, {
        version,
        stackOutputs: Lazy.list({
          produce: () => Array.from(listsMap ? listsMap.keys() : []),
        }),
      });
    }

    Object.entries(backendOutputEntry.payload).forEach(([listName, value]) => {
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
    });
  };
}
