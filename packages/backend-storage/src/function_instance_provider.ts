import {
  AmplifyFunction,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
} from '@aws-amplify/plugin-types';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import {
  S3EventSource,
  S3EventSourceProps,
} from 'aws-cdk-lib/aws-lambda-event-sources';
import { Bucket } from 'aws-cdk-lib/aws-s3';

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
 * Add s3 event source for lambda function.
 */
export const addEventSource = (
  bucket: Bucket,
  lambda: IFunction,
  eventSourceProp: S3EventSourceProps
) => {
  lambda.addEventSource(new S3EventSource(bucket, eventSourceProp));
};
