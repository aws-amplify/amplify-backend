import { OutputStorageStrategy } from '@aws-amplify/plugin-types';
import { aws_ssm, CfnOutput, Stack } from 'aws-cdk-lib';
import { AmplifyStack } from './amplify_stack.js';

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
  constructor(private readonly stack: Stack) {
    /*
     * Note: Not sure that this is the correct place for this logic. It shouldn't be in AmplifyStack because this logic is
     * specific to the OutputStorageStrategy. But it's also weird for the AmplifyStack to expose projectEnvironmentIdentifier.
     *
     * This is basically using the stack as a courier to carry the projectEnvironmentIdentifier from where the stack is initialized to here.
     * We may want to introduce some other class or interface to act as that courier in the future
     */
    if (stack instanceof AmplifyStack) {
      new aws_ssm.StringParameter(stack, 'amplifyStackIdentifier', {
        parameterName:
          stack.projectEnvironmentIdentifier.toOutputStackSSMParameterName(),
        stringValue: stack.stackName,
      });
    }
  }

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

    this.stack.addMetadata(constructPackage, {
      constructVersion,
      stackOutputs: Object.keys(data),
    });
  }
}
