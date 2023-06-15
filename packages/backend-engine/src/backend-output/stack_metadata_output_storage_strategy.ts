import { OutputStorageStrategy } from '@aws-amplify/plugin-types';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { BackendOutput } from './backend_output_schemas.js';
import { amplifyStackMetadataKey } from './amplify_stack_metadata_key.js';

/**
 * Implementation of OutputStorageStrategy that stores config data in stack metadata and outputs
 */
export class StackMetadataOutputStorageStrategy
  implements OutputStorageStrategy
{
  private readonly metadata: BackendOutput = {};
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
  storeOutput(
    constructPackage: string,
    constructVersion: string,
    data: Record<string, string>
  ): void {
    // add all the data values as stack outputs
    Object.entries(data).forEach(([key, value]) => {
      new CfnOutput(this.stack, key, { value });
    });

    this.metadata[constructPackage] = {
      constructVersion,
      stackOutputs: Object.keys(data),
    };
  }

  /**
   * Persists the metadata object to the stack metadata
   */
  flush(): void {
    this.stack.addMetadata(amplifyStackMetadataKey, this.metadata);
  }
}
