import { OutputStorageStrategy } from '@aws-amplify/plugin-types';
import { CfnOutput, Stack } from 'aws-cdk-lib';

/**
 * Implementation of OutputStorageStrategy that stores config data in stack metadata and outputs
 */
export class StackMetadataOutputStorageStrategy
  implements OutputStorageStrategy
{
  /**
   * Initialize the instance with a stack
   */
  constructor(private readonly stack: Stack) {}
  /**
   * Store frontend config data as stack metadata and outputs
   */
  storeOutputs(
    frontendConfigPlugin: string,
    expectedSemver: string,
    data: Record<string, string>
  ): void {
    // add all the data values as stack outputs
    Object.entries(data).forEach(([key, value]) => {
      new CfnOutput(this.stack, key, { value });
    });

    this.stack.addMetadata(frontendConfigPlugin, {
      expectedSemver,
      stackOutputs: Object.keys(data),
    });
  }
}
