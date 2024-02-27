/**
 * outputs generated by AWS Amplify (Gen 2) backends
 */
export type ClientConfigV2 = {
  /**
   * Version of this schema
   */
  _version: '2';
  /**
   * Outputs generated from defineAuth
   */
  auth?: Auth;
  /**
   * Outputs generated from backend.addOutput({custom: <config>})
   */
  custom?: Custom;
  /**
   * Outputs generated from defineData
   */
  data?: Data;
  storage?: Storage;
};

/**
 * Outputs generated from defineAuth
 */
export type Auth = {
  aws_region?: AwsRegion;
  /**
   * Cognito Identity Pool ID
   */
  identity_pool_id?: string;
  identity_providers?: string[];
  mfa_configuration?: MfaConfiguration;
  mfa_methods?: MfaMethod[];
  oauth_domain?: string;
  oauth_redirect_sign_in?: string;
  oauth_redirect_sign_out?: string;
  oauth_response_type?: OauthResponseType;
  oauth_scope?: string[];
  password_policy?: PasswordPolicy;
  standard_attributes?: StandardAttributes;
  /**
   * Cognito User Pool Client ID
   */
  user_pool_client_id?: string;
  /**
   * Cognito User Pool ID
   */
  user_pool_id?: string;
  user_verification_mechanisms?: User[];
  username_attributes?: User[];
};

export enum AwsRegion {
  UsEast1 = 'us-east-1',
  UsEast2 = 'us-east-2',
  UsWest1 = 'us-west-1',
  UsWest2 = 'us-west-2',
}

export enum MfaConfiguration {
  None = 'NONE',
  Optional = 'OPTIONAL',
  Required = 'REQUIRED',
}

export enum MfaMethod {
  SMS = 'SMS',
  Totp = 'TOTP',
}

export enum OauthResponseType {
  Code = 'code',
  Token = 'token',
}

export type PasswordPolicy = {
  min_length?: number;
  require_digits?: boolean;
  require_lowercase?: boolean;
  require_numbers?: boolean;
  require_symbols?: boolean;
  require_uppercase?: boolean;
};

export type StandardAttributes = {
  address?: StandardAttribute;
  birthdate?: StandardAttribute;
  email?: StandardAttribute;
  family_name?: StandardAttribute;
  gender?: StandardAttribute;
  given_name?: StandardAttribute;
  locale?: StandardAttribute;
  middle_name?: StandardAttribute;
  name?: StandardAttribute;
  nickname?: StandardAttribute;
  phone_number?: StandardAttribute;
  picture?: StandardAttribute;
  preferred_username?: StandardAttribute;
  profile?: StandardAttribute;
  sub?: StandardAttribute;
  updated_at?: StandardAttribute;
  website?: StandardAttribute;
  zoneinfo?: StandardAttribute;
};

export type StandardAttribute = {
  required?: boolean;
  [property: string]: any;
};

export enum User {
  Email = 'EMAIL',
  Phone = 'PHONE',
}

/**
 * Outputs generated from backend.addOutput({custom: <config>})
 */
export type Custom = {
  Geo?: Geo;
  [property: string]: any;
};

export type Geo = {
  aws_region?: AwsRegion;
  mapStyles?: MapStyle[];
};

export enum MapStyle {
  VectorEsriStreets = 'VectorEsriStreets',
  VectorEsriTopographic = 'VectorEsriTopographic',
}

/**
 * Outputs generated from defineData
 */
export type Data = {
  api_key?: string;
  authorization_types?: AuthorizationType[];
  aws_region?: AwsRegion;
  default_authorization_type?: string;
  /**
   * generated model introspection schema for use with generateClient
   */
  model_introspection?: { [key: string]: any };
  /**
   * AppSync endpoint URL
   */
  url?: string;
};

export enum AuthorizationType {
  APIKey = 'API_KEY',
  AmazonCognitoUserPools = 'AMAZON_COGNITO_USER_POOLS',
  AwsIam = 'AWS_IAM',
  AwsLambda = 'AWS_LAMBDA',
  OpenidConnect = 'OPENID_CONNECT',
}

export type Storage = {
  aws_region?: AwsRegion;
  name?: string;
};
