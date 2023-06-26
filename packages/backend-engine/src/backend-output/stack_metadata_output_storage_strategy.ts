import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { amplifyStackMetadataKey } from './amplify_stack_metadata_key.js';
import { BackendOutputStackMetadata } from './backend_output_schemas.js';

/**
 * Implementation of BackendOutputStorageStrategy that stores config data in stack metadata and outputs
 */
export class StackMetadataBackendOutputStorageStrategy
  implements BackendOutputStorageStrategy
{
  private readonly metadata: BackendOutputStackMetadata = [];
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
  addBackendOutputEntry(backendOutputEntry: BackendOutputEntry): void {
    // add all the data values as stack outputs
    Object.entries(backendOutputEntry.payload).forEach(([key, value]) => {
      new CfnOutput(this.stack, key, { value });
    });

    this.metadata.push({
      schemaName: backendOutputEntry.schemaIdentifier.schemaName,
      schemaVersion: backendOutputEntry.schemaIdentifier.schemaVersion,
      stackOutputs: Object.keys(backendOutputEntry.payload),
    });
  }

  /**
   * Persists the metadata object to the stack metadata
   */
  flush(): void {
    this.stack.addMetadata(amplifyStackMetadataKey, this.metadata);
  }
}
