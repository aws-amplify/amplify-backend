import { OutputStorageStrategy } from '@aws-amplify/plugin-types';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { OutputEntry } from './backend_output_schemas.js';

/**
 * Implementation of OutputStorageStrategy that stores config data in stack metadata and outputs
 */
export class StackMetadataOutputStorageStrategy
  implements OutputStorageStrategy
{
  /**
   * Initialize the instance with a stack.
   *
   * If the stack is an AmplifyStack, set a parameter in SSM so the stack can be identified later by the project environment
   */
  constructor(private readonly stack: Stack) {}

  /**
   * Store construct output as stack metadata and output
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

    const outputEntry: OutputEntry = {
      constructVersion,
      stackOutputs: Object.keys(data),
    };

    this.stack.addMetadata(constructPackage, outputEntry);
  }
}
