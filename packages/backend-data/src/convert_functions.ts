import { IFunction } from 'aws-cdk-lib/aws-lambda';
import {
  AmplifyFunction,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
} from '@aws-amplify/plugin-types';

/**
 * Convert the provided function input map into a map of IFunctions.
 */
export const convertFunctionNameMapToCDK = (
  getInstanceProps: ConstructFactoryGetInstanceProps,
  functions: Record<string, ConstructFactory<AmplifyFunction>>
): Record<string, IFunction> =>
  Object.fromEntries(
    Object.entries(functions).map(([functionName, functionInput]) => [
      functionName,
      functionInput.getInstance(getInstanceProps).resources.lambda,
    ])
  );
