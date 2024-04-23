import { CfnFunction, IFunction } from 'aws-cdk-lib/aws-lambda';

export type FunctionResources = {
  lambda: IFunction;
  cfnResources: {
    cfnFunction: CfnFunction;
  };
};
