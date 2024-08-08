import { ILayerVersion, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Arn } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { EOL } from 'os';

/**
 * Defines the ARN regex pattern for a layer.
 */
export const arnPattern = new RegExp(
  '^(arn:(aws[a-zA-Z-]*)?:lambda:[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\\d{1}:\\d{12}:layer:[a-zA-Z0-9-_]+:[0-9]+)|(arn:[a-zA-Z0-9-]+:lambda:::awslayer:[a-zA-Z0-9-_]+)$'
);

/**
 * Checks if the provided ARN is valid.
 */
export const isValidLayerArn = (arn: string): boolean => {
  return arnPattern.test(arn);
};

/**
 * Class to represent and handle Lambda Layer ARNs.
 */
export class FunctionLayerArn {
  public readonly arn: string;

  /**
   * Creates an instance of FunctionLayerArn.
   */
  constructor(arn: string) {
    if (!isValidLayerArn(arn)) {
      throw new Error(
        `Invalid ARN format for layer: ${arn} ${EOL} Expected format: arn:aws:lambda:<current-region>:<account-id>:layer:<layer-name>:<version>`
      );
    }
    this.arn = arn;
  }

  /**
   * Converts the FunctionLayerArn to a string.
   */
  toString(): string {
    return this.arn;
  }
}

/**
 * Parses a string to create a FunctionLayerArn instance.
 */
export const parseFunctionLayerArn = (arn: string): FunctionLayerArn => {
  return new FunctionLayerArn(arn);
};

/**
 * Validates the provided layer ARNs and throws an error if any are invalid or if there are more than 5 unique ARNs.
 */
export const validateLayers = (
  layers: Record<string, string>
): Set<FunctionLayerArn> => {
  const uniqueArns = new Set<string>(Object.values(layers));

  if (uniqueArns.size > 5) {
    throw new Error(
      'A maximum of 5 unique layers can be attached to a function.'
    );
  }

  return new Set<FunctionLayerArn>(
    Array.from(uniqueArns).map(parseFunctionLayerArn)
  );
};

/**
 * Resolves and returns the layers for an AWS Lambda function.
 */
export const resolveLayers = (
  layers: Record<string, string>,
  scope: Construct,
  functionName: string
): ILayerVersion[] => {
  const uniqueLayerArns = validateLayers(layers);
  return Array.from(uniqueLayerArns).map((layerArn) => {
    const layerName = Arn.extractResourceName(layerArn.toString(), 'layer');
    return LayerVersion.fromLayerVersionArn(
      scope,
      `${functionName}-${layerName}-layer`,
      layerArn.toString()
    );
  });
};
