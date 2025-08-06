import {
  FunctionResources,
  ResourceProvider,
} from '@aws-amplify/backend/types/platform';

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
  lambdaEntry: ResourceProvider<FunctionResources>;
};

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS';
