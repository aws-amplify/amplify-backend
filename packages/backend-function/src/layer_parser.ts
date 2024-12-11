import { AmplifyUserError } from '@aws-amplify/platform-core';

/**
 * Parses Lambda Layer ARNs for a function
 */
export class FunctionLayerArnParser {
  private arnPattern = new RegExp(
    'arn:[a-zA-Z0-9-]+:lambda:[a-zA-Z0-9-]+:\\d{12}:layer:[a-zA-Z0-9-_]+:[0-9]+'
  );
  private nameVersionPattern = new RegExp('^[a-zA-Z0-9-_]+:[0-9]+$');

  /**
   * Creates a new FunctionLayerArnParser
   * @param region - AWS region
   * @param account - AWS account ID
   */
  constructor(
    private readonly region: string,
    private readonly account: string
  ) {}

  /**
   * Parse the layers for a function
   * @param layers - Layers to be attached to the function. Each layer can be specified as either:
   *                - A full ARN (arn:aws:lambda:<region>:<account>:layer:<name>:<version>)
   *                - A name:version format (e.g., "my-layer:1")
   * @param functionName - Name of the function
   * @returns Valid layers for the function with resolved ARNs
   * @throws AmplifyUserError if the layer ARN or name:version format is invalid
   * @throws AmplifyUserError if the number of layers exceeds the limit
   */
  parseLayers(
    layers: Record<string, string>,
    functionName: string
  ): Record<string, string> {
    const validLayers: Record<string, string> = {};
    const uniqueArns = new Set<string>();

    for (const [key, value] of Object.entries(layers)) {
      let arn: string;

      if (this.isValidLayerArn(value)) {
        // If it's already a valid ARN, use it as is
        arn = value;
      } else if (this.isValidNameVersion(value)) {
        // If it's in name:version format, construct the ARN using provided region and account
        const [name, version] = value.split(':');
        arn = `arn:aws:lambda:${this.region}:${this.account}:layer:${name}:${version}`;
      } else {
        throw new AmplifyUserError('InvalidLayerFormatError', {
          message: `Invalid format for layer: ${value}`,
          resolution: `Layer must be either a full ARN (arn:aws:lambda:<region>:<account>:layer:<name>:<version>) or name:version format for function: ${functionName}`,
        });
      }

      // Ensure we don't add duplicate ARNs
      if (!uniqueArns.has(arn)) {
        uniqueArns.add(arn);
        validLayers[key] = arn;
      }
    }

    this.validateLayerCount(uniqueArns);
    return validLayers;
  }

  /**
   * Validate the ARN format for a Lambda Layer
   * @param arn - The ARN string to validate
   * @returns boolean indicating if the ARN format is valid
   */
  private isValidLayerArn(arn: string): boolean {
    return this.arnPattern.test(arn);
  }

  /**
   * Validate the name:version format for a Lambda Layer
   * @param value - The string to validate in format "name:version"
   * @returns boolean indicating if the format is valid
   */
  private isValidNameVersion(value: string): boolean {
    return this.nameVersionPattern.test(value);
  }

  /**
   * Validate the number of layers attached to a function
   * @param uniqueArns - Set of unique layer ARNs
   * @throws AmplifyUserError if the number of layers exceeds 5
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
