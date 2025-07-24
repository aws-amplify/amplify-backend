import * as lamb from 'aws-cdk-lib/aws-lambda';

//defines 4 potential sources for Lambda function
export type ExistingDirectory = { path: string };
export type ExistingLambda = { id: string; name: string };
export type NewFromCode = { code: string };
export type NewFromTemplate = { template: string };

//adds runtime to the source
type LambdaSource = {
  runtime: lamb.Runtime;
  source: ExistingDirectory | ExistingLambda | NewFromCode | NewFromTemplate;
};

export type RestApiConstructProps = {
  apiName: string;
  apiProps: RestApiPathConfig[];
};

export type RestApiPathConfig = {
  path: string;
  routes: HttpMethod[];
  lambdaEntry: LambdaSource;
};

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS';
