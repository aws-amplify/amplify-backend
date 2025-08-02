import { IFunction } from 'aws-cdk-lib/aws-lambda';

export type RestApiConstructProps = {
  apiName: string;
  apiProps: RestApiPathConfig[];
};

export type AuthorizerConfig =
  | { type: 'none' } // public
  | { type: 'userPool' } // signed-in users
  | { type: 'userPool'; groups: string[] }; // signed-in + group restriction

export type MethodsProps = {
  method: HttpMethod;
  authorizer?: AuthorizerConfig;
};

export type RestApiPathConfig = {
  path: string;
  methods: MethodsProps[];
  lambdaEntry: IFunction;
};

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS';
