import {
  AmplifyFunction,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
} from '@aws-amplify/plugin-types';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

export type FunctionInstanceProvider = {
  provide: (func: ConstructFactory<AmplifyFunction>) => IFunction;
};

/**
 * Build a function instance provider using the construct factory.
 */
export const buildConstructFactoryFunctionInstanceProvider = (
  props: ConstructFactoryGetInstanceProps
) => ({
  provide: (functionFactory: ConstructFactory<AmplifyFunction>): IFunction =>
    functionFactory.getInstance(props).resources.lambda,
});
