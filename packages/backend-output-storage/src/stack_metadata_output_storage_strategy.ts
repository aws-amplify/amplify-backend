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
  private lazyLists: Record<MetadataKey, Record<OutputKey, string[]>> = {};

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

    this.stack.addMetadata(keyName, {
      version: backendOutputEntry.version,
      stackOutputs: Object.keys(backendOutputEntry.payload),
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

    Object.entries(backendOutputEntry.payload).forEach(([listName, value]) => {
      // prevent prototype-polluting assignment
      if (
        keyName === '__proto__' ||
        keyName === 'constructor' ||
        keyName === 'prototype'
      ) {
        return;
      }
      if (this.lazyLists[keyName]?.[listName]) {
        this.lazyLists[keyName][listName].push(value);
      } else {
        const outputList: string[] = [value];
        if (this.lazyLists[keyName]) {
          this.lazyLists[keyName][listName] = outputList;
        } else {
          this.lazyLists[keyName] = {
            [listName]: outputList,
          };
        }
        new CfnOutput(this.stack, listName, {
          value: Lazy.string({ produce: () => JSON.stringify(outputList) }),
        });

        const existingMetadataEntry = this.stack.node.metadata.find(
          (entry) => entry.type === keyName
        );

        if (existingMetadataEntry) {
          if (existingMetadataEntry.data.version !== version) {
            throw new Error(
              `Metadata entry for ${keyName} at version ${existingMetadataEntry.data.version} already exists. Cannot add another entry for the same key at version ${version}`
            );
          }
        } else {
          this.stack.addMetadata(keyName, {
            version,
            stackOutputs: Lazy.list({
              produce: () => Object.keys(this.lazyLists[keyName]),
            }),
          });
        }
      }
    });
  };
}
