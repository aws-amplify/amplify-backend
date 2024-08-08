import { ILayerVersion, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Arn } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

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
 * Validates the provided layer ARNs and throws an error if any are invalid or if there are more than 5 unique ARNs.
 */
export const validateLayers = (
  layers: Record<string, LayerReference>
): Set<string> => {
  // Remove duplicate layer Arn's
  const uniqueArns = new Set(Object.values(layers).map((layer) => layer.arn));

  // Only 5 layers can be attached to a function
  if (uniqueArns.size > 5) {
    throw new Error(
      'A maximum of 5 unique layers can be attached to a function.'
    );
  }

  // Check if all Arn inputs are a valid Layer A
  for (const [layerName, layerObj] of Object.entries(layers)) {
    if (!isValidLayerArn(layerObj.arn)) {
      throw new Error(
        `Invalid ARN format for layer ${layerName}: ${layerObj.arn}`
      );
    }
  }

  return uniqueArns;
};

/**
 * Type definition for a layer reference.
 */
export type LayerReference = { arn: string };

/**
 * Creates a reference to a layer from an ARN.
 */
export const referenceFunctionLayer = (arn: string): LayerReference => {
  return { arn };
};

/**
 * Resolves and returns the layers for an AWS Lambda function.
 */
export const resolveLayers = (
  layers: Record<string, LayerReference>,
  scope: Construct,
  functionName: string
): ILayerVersion[] => {
  validateLayers(layers);
  const uniqueArns = validateLayers(layers);
  return Array.from(uniqueArns).map((arn) => {
    const layerName = Arn.extractResourceName(arn, 'layer');
    return LayerVersion.fromLayerVersionArn(
      scope,
      `${functionName}-${layerName}-layer`,
      arn
    );
  });
};
