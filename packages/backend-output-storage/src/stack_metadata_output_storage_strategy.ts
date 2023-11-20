import {
  type BackendOutputEntry,
  type BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import { CfnOutput, type Stack } from 'aws-cdk-lib';

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
}
