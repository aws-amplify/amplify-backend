import { AmplifyUserError } from '@aws-amplify/platform-core';

/**
 * Parses Lambda Layer ARNs for a function
 */
export class FunctionLayerArnParser {
  private arnPattern = new RegExp(
    'arn:[a-zA-Z0-9-]+:lambda:[a-zA-Z0-9-]+:\\d{12}:layer:[a-zA-Z0-9-_]+:[0-9]+'
  );

  /**
   * Parse the layers for a function
   * @param layers - Layers to be attached to the function
   * @param functionName - Name of the function
   * @returns Valid layers for the function
   * @throws AmplifyUserError if the layer ARN is invalid
   * @throws AmplifyUserError if the number of layers exceeds the limit
   */
  parseLayers(
    layers: Record<string, string>,
    functionName: string
  ): Record<string, string> {
    const validLayers: Record<string, string> = {};
    const uniqueArns = new Set<string>();

    for (const [key, arn] of Object.entries(layers)) {
      if (!this.isValidLayerArn(arn)) {
        throw new AmplifyUserError('InvalidLayerArnFormatError', {
          message: `Invalid ARN format for layer: ${arn}`,
          resolution: `Update the layer ARN with the expected format: arn:aws:lambda:<current-region>:<account-id>:layer:<layer-name>:<version> for function: ${functionName}`,
        });
      }

      // Add to validLayers and uniqueArns only if the ARN hasn't been added already
      if (!uniqueArns.has(arn)) {
        uniqueArns.add(arn);
        validLayers[key] = arn;
      }
    }

    // Validate the number of unique layers
    this.validateLayerCount(uniqueArns);

    return validLayers;
  }

  /**
   * Validate the ARN format for a Lambda Layer
   */
  private isValidLayerArn(arn: string): boolean {
    return this.arnPattern.test(arn);
  }

  /**
   * Validate the number of layers attached to a function
   * @see https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html#function-configuration-deployment-and-execution
   */
  private validateLayerCount(uniqueArns: Set<string>): void {
    if (uniqueArns.size > 5) {
      throw new AmplifyUserError('MaximumLayersReachedError', {
        message: 'A maximum of 5 unique layers can be attached to a function.',
        resolution: 'Remove unused layers in your function',
      });
    }
  }
}
