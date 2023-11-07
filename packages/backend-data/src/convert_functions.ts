import { IFunction } from 'aws-cdk-lib/aws-lambda';
import {
  AmplifyFunction,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
} from '@aws-amplify/plugin-types';

/**
 * Type used for function provider injection while transforming data props.
 */
export type FunctionInstanceProvider = {
  provide: (func: ConstructFactory<AmplifyFunction>) => IFunction;
};

/**
 * Build a function instance provider using the construct factory.
 */
export const buildConstructFactoryFunctionInstanceProvider = (
  props: ConstructFactoryGetInstanceProps
) => ({
  provide: (func: ConstructFactory<AmplifyFunction>): IFunction =>
    func.getInstance(props).resources.lambda,
});

/**
 * Convert the provided function input map into a map of IFunctions.
 */
export const convertFunctionNameMapToCDK = (
  functionInstanceProvider: FunctionInstanceProvider,
  functions: Record<string, ConstructFactory<AmplifyFunction>>
): Record<string, IFunction> =>
  Object.fromEntries(
    Object.entries(functions).map(([functionName, functionInput]) => [
      functionName,
      functionInstanceProvider.provide(functionInput),
    ])
  );
