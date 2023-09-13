import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';

export type FunctionResources = {
  lambda: LambdaFunction;
};
