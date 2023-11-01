import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { ConstructFactoryGetInstanceProps } from '@aws-amplify/plugin-types';
import { AmplifyFunctionFactory } from '@aws-amplify/backend-function';
import { FunctionInput } from './types.js';

/**
 * Type used for function provider injection while transforming data props.
 */
export type FunctionInstanceProvider = {
  provide: (func: FunctionInput) => IFunction;
};

/**
 * Determine if the provided union type is an AmplifyFunctionFactory (based on presence of AmplifyFunctionFactory specific methods) and perform type narrowing.
 */
const isAmplifyFunctionFactory = (
  func: FunctionInput
): func is AmplifyFunctionFactory => {
  return (
    typeof func === 'object' &&
    'getInstance' in func &&
    typeof func.getInstance === 'function'
  );
};

/**
 * Function instance provider which uses the
 */
export const buildConstructFactoryFunctionInstanceProvider = (
  props: ConstructFactoryGetInstanceProps
) => ({
  provide: (func: FunctionInput): IFunction => {
    if (!isAmplifyFunctionFactory(func)) return func;
    return func.getInstance(props).resources.lambda;
  },
});

/**
 * Convert the provided function input map into a map of IFunctions.
 */
export const convertFunctionNameMapToCDK = (
  functionInstanceProvider: FunctionInstanceProvider,
  functions: Record<string, FunctionInput>
): Record<string, IFunction> =>
  Object.fromEntries(
    Object.entries(functions).map(([functionName, functionInput]) => [
      functionName,
      functionInstanceProvider.provide(functionInput),
    ])
  );
