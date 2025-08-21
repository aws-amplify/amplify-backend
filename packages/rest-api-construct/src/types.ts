import {
  FunctionResources,
  ResourceProvider,
} from '@aws-amplify/backend/types/platform';

export type RestApiConstructProps = {
  apiName: string;
  apiProps: RestApiPathConfig[];
  defaultAuthorizer?: AuthorizerConfig;
};

export type AuthorizerConfig =
  | { type: 'none' } // public
  | { type: 'userPool' }; // signed-in users
// TODO: Group Validation
// | { type: 'userPool', groups: string[] } // signed-in users in a group

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
