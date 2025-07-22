export type RestApiConstructProps = {
  apiName: string;
  path: string;
  routes: HttpMethod[];
  lambdaEntry: string;
};

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS';
