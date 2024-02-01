import {
  AppendableBackendOutputEntry,
  BackendOutputEntry,
  BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import { CfnOutput, Lazy, Stack } from 'aws-cdk-lib';

/**
 * Implementation of BackendOutputStorageStrategy that stores config data in stack metadata and outputs
 */
export class StackMetadataBackendOutputStorageStrategy
  implements BackendOutputStorageStrategy<BackendOutputEntry>
{
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
   * Creates a backend output entry that can be appended to.
   */
  addAppendableBackendOutputEntry = <U extends BackendOutputEntry>(
    keyName: string,
    initialEntry: U
  ): AppendableBackendOutputEntry<U> => {
    Object.entries(initialEntry.payload).forEach(([key, value]) => {
      new CfnOutput(this.stack, key, { value });
    });
    const entry = initialEntry;
    this.stack.addMetadata(keyName, {
      version: entry.version,
      stackOutputs: Lazy.list({
        produce: () => {
          return Object.keys(entry.payload);
        },
      }),
    });
    return {
      version: entry.version,
      addToPayload: (key: string, value: string) => {
        if (key in entry.payload) {
          throw new Error(`Output ${key} is already defined`);
        }
        entry.payload[key] = value;
        new CfnOutput(this.stack, key, { value });
      },
    };
  };
}
