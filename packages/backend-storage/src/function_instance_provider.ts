import {
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

export type FunctionInstanceProvider = {
  provide: (
    func: ConstructFactory<ResourceProvider<FunctionResources>>
  ) => IFunction;
};

/**
 * Build a function instance provider using the construct factory.
 */
export const buildConstructFactoryFunctionInstanceProvider = (
  props: ConstructFactoryGetInstanceProps
): FunctionInstanceProvider => ({
  provide: (functionFactory): IFunction =>
    functionFactory.getInstance(props).resources.lambda,
});
