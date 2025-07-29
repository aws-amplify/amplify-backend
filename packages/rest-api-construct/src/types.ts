import * as lamb from 'aws-cdk-lib/aws-lambda';

//defines 3 potential sources for Lambda function
export type ExistingDirectory = { path: string };
export type ExistingLambda = { id: string; name: string };
export type NewFromCode = { code: string; functionName: string };

//adds runtime to the source
export type LambdaSource = {
  runtime: lamb.Runtime;
  source: ExistingDirectory | ExistingLambda | NewFromCode;
};

export type RestApiConstructProps = {
  apiName: string;
  apiProps: RestApiPathConfig[];
};

export type RestApiPathConfig = {
  path: string;
  methods: HttpMethod[];
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
