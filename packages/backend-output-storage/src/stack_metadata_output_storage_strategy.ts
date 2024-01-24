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
   * Store construct output as stack output and add pending metadata to the metadata object.
   *
   * Metadata is not written to the stack until flush() is called
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

  // TODO this should be pushed to interface as well.
  addAppendableBackendOutputEntry = (
    keyName: string
  ): AppendableBackendOutputEntry => {
    const outputs: Record<string, string> = {};
    this.stack.addMetadata(keyName, {
      // TODO we should have some discriminator to distinguish dynamic entry from typed one
      version: '1',
      stackOutputs: Lazy.list({
        produce: () => {
          return Object.keys(outputs);
        },
      }),
    });
    return {
      appendOutput: (key: string, value: string) => {
        if (key in outputs) {
          throw new Error(`Output ${key} is already defined`);
        }
        outputs[key] = value;
        new CfnOutput(this.stack, key, { value });
      }
    }
  };
}
