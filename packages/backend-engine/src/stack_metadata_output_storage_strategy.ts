import { OutputStorageStrategy } from '@aws-amplify/plugin-types';
import { aws_ssm, CfnOutput, Stack } from 'aws-cdk-lib';

/**
 * Implementation of OutputStorageStrategy that stores config data in stack metadata and outputs
 */
export class StackMetadataOutputStorageStrategy
  implements OutputStorageStrategy
{
  /**
   * Initialize the instance with a stack
   */
  constructor(
    private readonly stack: Stack,
    projectName: string,
    environmentName: string
  ) {
    new aws_ssm.StringParameter(stack, 'amplifyStackIdentifier', {
      parameterName: `/amplify/${projectName}/${environmentName}/mainStackName`,
      stringValue: stack.stackName,
    });
  }
  /**
   * Store construct output as stack metadata and output
   */
  storeOutputs(
    constructPackage: string,
    constructVersion: string,
    data: Record<string, string>
  ): void {
    // add all the data values as stack outputs
    Object.entries(data).forEach(([key, value]) => {
      new CfnOutput(this.stack, key, { value });
    });

    this.stack.addMetadata(constructPackage, {
      constructVersion,
      stackOutputs: Object.keys(data),
    });
  }
}
